 #Load assemblies  
 [System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint")> $null  
 [System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint.Portal")> $null  
 [System.Reflection.Assembly]::LoadWithPartialName("Microsoft.SharePoint.Security")> $null  
 $farm = [Microsoft.SharePoint.Administration.SPFarm]::Local;  
 $services = @($farm.Services | where -FilterScript {$_.GetType() -eq [Microsoft.SharePoint.Administration.SPWebService]})  
 foreach ($service in $services)  
 {  
   foreach($app in $service.WebApplications)  
   {  
     $sites = $app.Sites  
     foreach ($site in $sites)  
     {      
       if (!$site.ServerRelativeUrl.Contains("ssp/"))  
       {  
            foreach ($currentWeb in $site.AllWebs)  
            {  
                 $pages = $currentWeb.Files | Where-Object {$_.Name -match ".aspx"}  
                 Write-Host "Analyzing Web $($currentWeb.Url)."  
                 foreach($currentPage in $pages)  
                 {  
                      Write-Host "Analyzing Page $($currentPage.ServerRelativeUrl)."  
                      if ($currentPage.CheckedOutByUser -ne $NULL)  
                      {  
                           $currentPage.CheckIn("Administratively Checked-In");  
                      }  
                      $url = $currentPage.ServerRelativeUrl;  
                      if ($url -eq $NULL)  
                      {  
                           continue  
                      }  
                      $webPartManager = $currentWeb.GetLimitedWebPartManager($url, [System.Web.UI.WebControls.WebParts.PersonalizationScope]::Shared)  
                      $closedWebparts = New-Object System.Collections.ArrayList  
                      $badWebparts = New-Object System.Collections.ArrayList  
                      foreach($webpart in $webPartManager.WebParts)  
                      {  
                           if($webpart.IsClosed)  
                           {  
                                $closedWebparts.add($webpart);  
                           }  
                           elseif ($webpart.FatalError)  
                           {  
                                $badWebparts.add($webPart)  
                           }  
               else  
               {  
                 $webPart.AllowClose = $FALSE;  
                 $webPart.AllowZoneChange = $TRUE;  
               }  
                      }  
                      foreach($webpart in $closedWebparts)  
                      {  
                           Write-Host "Deleting closed webpart $($webpart.Title) on page $($currentPage.ServerRelativeUrl)."  
                           $webPartManager.DeleteWebPart($webpart);  
                      }  
                      foreach($webpart in $badWebparts)  
                      {  
                           Write-Host "$($webpart.ID) on $($currentPage.ServerRelativeUrl) is reporting $($webpart.ImportErrorMessage) "  
                           #$webPartManager.DeleteWebPart($webpart);  
                      }  
                 }  
                 $currentWeb.Dispose()  
            }  
       }  
          $site.Dispose()  
     }  
   }  
 }  