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
3. Run `npm run build`. The output will be five files placed in the **/dist/** folder:
   - **web-utils.d.ts** Typescript definitions file
   - **web-utils.js**: Bundled JavaScript library
   - **web-utils.js.map**: Source map that associates the bundled library with the original source files
   - **web-utils.min.js** Minified version of the library, optimized for size
   - **web-utils.min.js.map** Source map that associates the minified library with the original source files

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