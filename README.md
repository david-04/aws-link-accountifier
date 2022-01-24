# aws-link-accountifier

A [Tampermonkey](https://www.tampermonkey.net/) script to create account-specific links to the AWS Management Console. When opened, these links prompt/redirect users to switch to the right AWS account (if they are currently logged into another one).

## Project status

The aws-link-accountifier is currently under development. Most features have been implemented and are fully functional, though. Links can be created and the script prompts/redirects the user to switch the account as required.

Accountified links also work without the aws-link-accountifier being installed. However, this depends on the AWS Management Console ignoring the extra metadata that is appended to the URL. In the future, Amazon might deploy changes to the AWS website, causing these links to break.

To mitigate this issue, an optional redirect mechanism will be added next. This will make sure that links are guaranteed to work perpetually, even if the aws-link-accountifier is not installed. The related code change _might_ be a breaking one, requiring a re-installation and/or re-configuration of the script.

Until the redirect mechanism is in place, it is recommended to not use accountified links for long-term purposes. The links might break in the future and should be migrated to the redirect mechanism once it has been implemented. This might turn into a rather laborious task if a lot of links have already been spread across large documentations.

## Installation

- Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension
- Open the extension's options
- Go to the `Utilities` tab and scroll down to the `Install from URL` section
- Paste the following URL into the input field:
  <https://raw.githubusercontent.com/david-04/aws-link-accountifier/main/dist/tampermonkey/aws-link-accountifier.js>
- Click on the `Install` button
- On the confirmation page, click the `Install` button
- Reload any open AWS Management Console tabs to active the script

## Usage

To create an accountified link, open any page within the AWS Management Console and either

- right-click anywhere on the page and select `Tampermonkey` => `AWS Link Accountififer` => `Copy link to clipboard` from the context menu, or
- click on the Tampermonkey icon in the toolbar and select `AWS Link Accountififer` => `Copy link to clipboard`.

This will use the current page's URL and append a(nother) hash with additional account information, e.g.:

https://s3.console.aws.amazon.com/s3/buckets/aws-link-accountififer?region=ap-southeast-2&tab=objects#aws-link-accountifier=%7B%22account%22%3A%7B%22id%22%3A%22123456789000%22%2C%22alias%22%3A%22pet-projects%22%2C%22exampleRole%22%3A%22pet-projects-ReadOnly%22%7D%7D

When opening this link in the browser, the aws-link-accountifier checks if the current AWS session is for the same account (`123456789000` in this example). If this is not the case, it redirects the browser to the AWS switch role page. This page is configurable (see next section).

## Configuration

When opening an accountified link, the aws-link-accountifier might trigger a redirect to switch accounts. The URL can be configured by opening any page within the AWS Management Console and either

- right-click anywhere on the page and select `Tampermonkey` => `AWS Link Accountififer` => `Set account switch URL` from the context menu, or
- click on the Tampermonkey icon in the toolbar and select `AWS Link Accountififer` => `Set account switch URL`.

In the prompt that follows, enter the new URL. It van contain the following placeholders:

- `${ACCOUNT_ID}` (the 12 digit account ID, e.g. `123456789012`)
- `${ACCOUNT_ALIAS}` (the alias name if set, e.g. `pet-projects`)
- `${ROLE_NAME}` (the role that was active when the link was created, e.g. `pet-projects-ReadOnly`)

The role name does not necessarily refer to the recommended role. For example, the link could have been created by an admin user with a read/write role. But the person opening the link might only have read access (or prefer to sign in as read-only). The aws-link-accountifier does not trigger an account/role switch if the current session already matches the account ID.

Unless configured otherwise, the aws-link-accountifier uses the AWS account/role switch page:

```
https://signin.aws.amazon.com/switchrole?account=${ACCOUNT_ID}&roleName=${ROLE_NAME}
```

To instead enforce a complete re-login, use the specific account's login page instead:

```
https://${ACCOUNT_ID}.signin.aws.amazon.com/console/
```

When using an SSO solution that leads to the account selection page, set the URL to the SSO instead.
