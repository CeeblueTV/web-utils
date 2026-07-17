[Usage](#usage) | [Building locally](#building-locally) | [Documentation](#documentation) | [Contribution](#contribution) | [License](#license)

# Ceeblue Web Utilities

This is a basic component library for Ceeblue projects, consisting of a collection of essential tools and utilities used in all Ceeblue web projects.

## Usage

Add the library as a dependency to your npm project using:
```bash
npm install @ceeblue/web-utils
```
Then [import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) the library into your project, for example:
 ```javascript
import { Util, ILog } from '@ceeblue/web-utils';
```

The package root (`@ceeblue/web-utils`) is pure logic — no DOM, no CSS. DOM/canvas components live in the `ui` subpath:
```javascript
import { UIMetrics, UITimeline } from '@ceeblue/web-utils/ui';
```

It also ships the Ceeblue design-system stylesheets. Import the layers you need, in order — each consumes the ones before it:
```javascript
import '@ceeblue/web-utils/tokens.css';        // design tokens (colors, radii, fonts, themes)
import '@ceeblue/web-utils/foundation.css';    // reset + base typography + scrollbars
import '@ceeblue/web-utils/components.css';     // app shell + generic UI components
```
The stylesheets use [cascade layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer) (`ceeblue.tokens` < `ceeblue.foundation` < `ceeblue.components`), so downstream styles override them without specificity hacks.

The DOM/canvas components read these tokens at runtime — `UITimeline`, for instance, resolves `--accent`, `--ok`/`--warn`/`--err`, `--txt`, `--track-N`, the fonts and the tooltip surface tokens — so they follow your theme automatically when the stylesheets are loaded, and fall back to sensible built-in defaults when they aren't.
> [!IMPORTANT]
> 
> If your project uses TypeScript, it is recommended that you set target: "ES6" in your configuration to match our use of ES6 features and ensure that your build will succeed (for those requiring a backward-compatible UMD version, a local build is recommended).
> Then define the "moduleResolution" compiler option: "Node" in tsconfig.json helps with import failures by ensuring that TypeScript uses the correct import resolution strategy based on the targeted Node.js version.
>   ```json
>   {
>      "compilerOptions": {
>         "target": "ES6",
>         "moduleResolution": "Node"
>      }
>   }
>   ```

> [!TIP]
> 
> To debug production code without modifying it, the library can use special query parameter of the main page's URL:
> - __!cb-override-log-level__ : allows to override the log level for the entire library, see [Log.ts](./src/Log.ts) for details on handling log levels.

## Building locally

1. [Clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository
2. Got to the `web-utils` folder and run `npm install` to install the packages dependencies.
3. Run `npm run build`. The output is placed in the **/dist/** folder, one set of files per entry point — `web-utils` (the pure-logic root) and `ui/web-utils-ui` (the DOM/canvas components):
   - **web-utils.d.ts** Typescript definitions file
   - **web-utils.js**: Bundled JavaScript library
   - **web-utils.js.map**: Source map that associates the bundled library with the original source files
   - **web-utils.min.js** Minified version of the library, optimized for size
   - **web-utils.min.js.map** Source map that associates the minified library with the original source files
   - the same five **ui/web-utils-ui.\*** files for the `@ceeblue/web-utils/ui` entry
   - **css/tokens.css**, **css/foundation.css** and **css/components.css** design-system stylesheets

```
git clone https://github.com/CeeblueTV/web-utils.git
cd web-utils
npm install
npm run build
```

## Documentation

This monorepo also contains built-in documentation about the APIs in the library, which can be built using the following npm command:
```
npm run build:docs
```

Once generated, open the `index.html` file located in the `docs` folder (`./docs/index.html`) with your browser.

> [!NOTE]
>
>  An online, continuously maintained version of the latest released documentation is available at https://ceebluetv.github.io/web-utils/

## Contribution

All contributions are welcome. Please see [our contribution guide](/CONTRIBUTING.md) for details.

## License

By contributing code to this project, you agree to license your contribution under the [GNU Affero General Public License](/LICENSE).