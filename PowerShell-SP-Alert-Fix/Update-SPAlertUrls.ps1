$oldrooturl = "https://<url>"

[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint") > $null
[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint.Portal") > $null
[System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint.Security") > $null

$farm = [Microsoft.SharePoint.Administration.SPFarm]::Local;
$services = @($farm.Services | where -FilterScript {$_.GetType() -eq [Microsoft.SharePoint.Administration.SPWebService]})

foreach ($service in $services) {
    foreach($app in $service.WebApplications) {
        if ($app.DisplayName.Contains('Central Administration')) {
            continue
        }
        $sites = $app.Sites
        foreach ($site in $sites) {
            if (!$site.ServerRelativeUrl.Contains("ssp/") -and !$site.ServerRelativeUrl.Contains("MySite")) {
                $rooturl = $site.Url.Replace($site.ServerRelativeUrl, '')
                foreach ($web in $site.AllWebs) {
                    $updated = 0
                    $alerts = $web.alerts
                    Write-Host "Number of Alerts in: $($web.url) : $($alerts.count)"
                    if ($alerts.count -ne 0) {
                        foreach ($alert in $alerts) {
                            $alert.Status = [Microsoft.SharePoint.SPAlertStatus]::Off
                            $alert.Update()
                            if ($alert.Properties -ne $null) {
                                $siteUrl = $alert.Properties["siteurl"]
                                if ($siteUrl -ne $null -and $siteUrl.Contains($oldrooturl)) {
                                    # Logic for URL replacement would go here
                                }
                            }
                        }
                    }
                    $web.Dispose()
                }
            }
            $site.Dispose()
        }
    }
}