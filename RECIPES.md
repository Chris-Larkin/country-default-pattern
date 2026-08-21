# Recipes

These recipes deliberately resolve a country hint outside the reference
function. Applications already know which signals they possess and which
countries their form permits.

Treat all snippets as integration sketches: header access and view syntax vary
by runtime and framework version.

## Resolve one hint

Recommended priority:

1. If the field already has a value, preserve it and do not apply a suggestion.
2. Use a context-specific preference explicitly saved by the user.
3. Use a country code supplied by trusted server or CDN infrastructure.
4. Use the first browser locale containing an explicit region.
5. Return no hint.

Validate every candidate as two ASCII letters and confirm that it exists in the
field's host-owned list of permitted country codes. A well-shaped code is not
necessarily available in a particular form.

Do not combine weak signals into a confidence score. A wrong suggestion is
cheap because it remains unselected; complexity and hidden inference are not.

## Infrastructure country headers

These values exist on the server or edge. They are not automatically available
to browser JavaScript. Validate the chosen two-letter code, then pass only that
code to the rendered form or component.

### Cloudflare

Cloudflare can add `CF-IPCountry`, containing an ISO 3166-1 alpha-2 code. Ignore
its special values `XX` (unknown) and `T1` (Tor):

```js
function cloudflareCountry(request) {
  const value = request.headers.get("CF-IPCountry")?.toUpperCase();
  return value && !["XX", "T1"].includes(value) ? value : null;
}
```

The visitor-location managed transform may need to be enabled. See
[Cloudflare's header documentation](https://developers.cloudflare.com/fundamentals/reference/http-headers/#cf-ipcountry).

### Vercel

Vercel functions receive `x-vercel-ip-country`:

```js
function vercelCountry(request) {
  return request.headers.get("x-vercel-ip-country");
}
```

See [Vercel's request-header documentation](https://vercel.com/docs/headers/request-headers#x-vercel-ip-country).

### Amazon CloudFront

CloudFront can add `CloudFront-Viewer-Country` when it is included in the
distribution's cache or origin-request policy:

```js
function cloudFrontCountry(request) {
  return request.headers.get("CloudFront-Viewer-Country");
}
```

See [AWS's viewer-location header documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-cloudfront-headers.html#cloudfront-headers-viewer-location).

### Trust and caching

- Accept a platform header only on traffic that actually passed through that
  platform. Strip or overwrite same-named inbound headers where the deployment
  permits clients to reach the origin directly.
- Do not use the hint for authorisation, availability, taxes, legal status, or
  fraud decisions.
- If server-rendered HTML is shared in a CDN cache, either vary that response by
  the trusted country header or keep the shared HTML unchanged and provide the
  hint through an appropriately uncached mechanism.
- Never send or store the visitor's IP address for this feature. The UI needs
  only a short-lived two-letter suggestion.

## Explicit locale-region fallback

Browser languages are preferences, not physical location. Use only a locale
that already contains an explicit region; do not turn `en` into `US` or `es`
into `ES`.

```js
function countryFromLanguages(languages = navigator.languages) {
  for (const language of languages ?? []) {
    try {
      const region = new Intl.Locale(language).region;
      if (region) return region;
    } catch {
      // Ignore malformed application- or browser-provided tags.
    }
  }

  return null;
}
```

`navigator.languages` is ordered by preference and may be reduced by browsers
for privacy. See [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/languages).

## Native HTML

Render a blank placeholder as the first direct child, followed by labelled
groups when a valid suggestion exists:

```html
<label for="country">Country</label>
<select id="country" name="country" autocomplete="country" required>
  <option value="">Select a country</option>
  <optgroup label="Suggested">
    <option value="GB">United Kingdom</option>
  </optgroup>
  <optgroup label="All countries">
    <option value="AF">Afghanistan</option>
    <option value="AL">Albania</option>
  </optgroup>
</select>
```

The empty option—not the suggested country—remains selected. If there is no
valid hint, render the application's ordinary list without a Suggested group.

Do not introduce a disabled dash option as a separator. Labelled groups convey
the relationship more clearly, while `<hr>` inside a native select is currently
decorative and absent from the accessibility tree.

## Existing libraries

Always use the version and documentation already selected by the host project.
These examples demonstrate the configuration pattern rather than replacing
each project's full integration guidance.

### Django: `django-countries`

Current versions support request-specific ordering with `countries_context`.
Keep a blank label on the field and construct the form inside the context:

```python
from django import forms
from django_countries import countries_context
from django_countries.fields import CountryField


class CheckoutForm(forms.Form):
    country = CountryField(blank_label="Select a country").formfield(
        required=True,
    )


def checkout(request):
    hint = request.country_hint  # Already validated by application middleware.
    with countries_context(first=[hint] if hint else [], first_repeat=False):
        form = CheckoutForm(request.POST or None)
    # Render form normally; do not set an initial country from the hint.
```

See the official [dynamic-ordering](https://smileychris.github.io/django-countries/advanced/dynamic-ordering/)
and [forms](https://smileychris.github.io/django-countries/usage/forms/)
documentation.

### Rails: `country_select`

Resolve and validate the optional hint before rendering the view. Combine
`priority_countries` with a blank option, and do not supply `selected`:

```erb
<%= form.country_select :country_code,
      {
        priority_countries: @country_hint ? [@country_hint] : [],
        include_blank: "Select a country"
      } %>
```

See the [`country_select` README](https://github.com/countries/country_select#usage).

### Symfony: `CountryType`

Pass an already resolved hint into the form rather than reading the request
stack from the form type itself:

```php
$builder->add('country', CountryType::class, [
    'preferred_choices' => $countryHint ? [$countryHint] : [],
    'duplicate_preferred_choices' => false,
    'placeholder' => 'Select a country',
]);
```

Do not set the `data` option from the hint. See Symfony's
[`CountryType` reference](https://symfony.com/doc/current/reference/forms/types/country.html).

### React: `react-country-region-selector`

The component already accepts country codes through `priorityOptions`. Keep the
controlled value empty until `onChange` reports a user choice:

```jsx
<CountryDropdown
  value={country}
  onChange={setCountry}
  priorityOptions={countryHint ? [countryHint] : []}
  defaultOptionLabel="Select a country"
/>
```

See the project's [`CountryDropdown` options](https://country-regions.github.io/react-country-region-selector/docs/countrydropdown/).

### Vanilla: `country-region-selector`

The vanilla component supports `data-preferred`. A server-rendered form can set
that attribute to a validated hint while retaining its normal default option:

```html
<select
  class="crs-country"
  data-region-id="region"
  data-preferred="GB"
  data-default-option="Select a country"
></select>
```

Omit or empty `data-preferred` when there is no hint. See the project's
[`data-preferred` documentation](https://github.com/country-regions/country-region-selector#list-of-data--attributes).

### `intl-tel-input`

For an empty telephone field, use a host-provided hint only to order the menu.
Do not pass it as `initialCountry`, and do not use `initialCountryLookup`, because
those options select the country:

```js
const input = document.querySelector("#phone");
const hint = document.documentElement.dataset.countryHint?.toLowerCase();

intlTelInput(input, {
  countryOrder: hint ? [hint] : undefined,
});
```

Resolve the hint before initialisation. Do not asynchronously reorder the list
after the user starts typing. When no initial-country option is supplied, the
component starts in its empty/globe state; countries omitted from `countryOrder`
remain alphabetical. See the official
[`countryOrder` and initial-country documentation](https://intl-tel-input.com/docs/options#countryOrder).

## Field semantics

Choose hints based on the question being asked:

| Field | Reasonable hints | Avoid |
| --- | --- | --- |
| Shipping address country | Saved shipping address, current-location country | Nationality or language alone |
| Billing address country | Saved billing address, perhaps current-location country | Silently copying shipping country |
| Telephone country code | Existing international number, saved phone region, contextual suggestion | Selecting an IP-derived dialing code |
| Nationality/citizenship | Explicit saved answer only | IP, locale, device region |
| Country of residence | Explicit saved answer; location only as a visibly unselected suggestion | Treating location as proof of residence |

Travellers and VPN users are expected failure cases. They see one incorrect
suggestion followed by the ordinary list, with no form value changed.
