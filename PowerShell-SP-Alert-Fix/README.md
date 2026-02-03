# SharePoint Alert URL Fixer

### Overview

During a SharePoint migration (2007 to 2010 or URL changes), alert subscriptions often retain a hard-coded reference to the old server root URL. This script iterates through the entire farm and updates all Alert Subscriptions to ensure that generated links point to the current, correct Farm URL.

### Features

* **Farm-Wide Execution:** Automatically loops through all Web Applications in the farm.
* **Built-in Filters:** Automatically skips **Central Administration**, **SSP** (Shared Services Provider), and **MySite** host sites to prevent unintended configuration changes.
* **Safe Execution:** Disposes of web and site objects properly to prevent memory leaks during large-scale iterations.

### Requirements

* **SharePoint Version:** SharePoint 2007 or SharePoint 2010.
* **Permissions:** Must be run by a user with **Farm Administrator** rights and **SPShellAdmin** access.

### Usage

1. Open the script and update the `$oldrooturl` variable at the top with the URL of your legacy farm (e.g., `https://oldportal.domain.com`).
2. Run the script from the **SharePoint Management Shell**.

```powershell
.\Update-SPAlertUrls.ps1

```

### Script Logic

The script performs the following actions:

1. Loads the required Microsoft SharePoint assemblies.
2. Identifies all `SPWebService` objects in the local farm.
3. For each alert in every site, it temporarily toggles the alert status and checks the `siteurl` property against the defined `$oldrooturl`.
4. Provides console feedback on the number of alerts found in each Web.