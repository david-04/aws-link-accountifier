# Change Log

## [1.0](https://github.com/david-04/aws-link-accountifier/releases/tag/v1.0) (2022-04-15)

- Performed technical maintenance (ESLint and SonarQube)

## [0.3](https://github.com/david-04/aws-link-accountifier/releases/tag/v0.3) (2022-02-25)

- Added [documentation](https://github.com/david-04/aws-link-accountifier/blob/main/README.md)
- Improved the login page flow for currently unauthenticated SSO users
- Made it easier to customize forks by moving config presets to a [separate file](https://github.com/david-04/aws-link-accountifier/blob/main/src/modules/presets.ts)
- Fixed an issue with the role-switch that could initiate a second account-switch

## [0.2](https://github.com/david-04/aws-link-accountifier/releases/tag/v0.2) (2022-02-23)

- Improved link operability by adding a redirect service
- Added the option to re-open the current page with a different role

## [0.1](https://github.com/david-04/aws-link-accountifier/releases/tag/v0.1) (2022-01-26)

- Added the ability to create "accountified" links
- Added orchestrated redirect flows when opening accountified links
- Added account hints to AWS sign-in and role-selection pages
