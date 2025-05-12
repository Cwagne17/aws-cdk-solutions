#Setup Core Requirements
#Ensure that the Windows environment has powershell version 5.1+ to 
#support the restapi calls 

# Check if running with admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Error "This script requires administrative privileges. Please run PowerShell as Administrator."
    exit 1
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Import-Module AWSPowerShell

#Setup Variables
$api = "APIVALUE"
$region = "REGIONID-VALUE"
$ssmregfile = $env:ProgramData + "\Amazon\SSM\InstanceData\registration"
$workingdir = $env:TEMP + "\ssm"
$versionMinimum = [Version]'5.1'

# Create event log source with error handling
try {
    if (-Not [system.diagnostics.eventlog]::SourceExists("SSM-Checkin")) {
        New-EventLog -LogName Application -Source "SSM-Checkin"
        Write-Host "Successfully created Event Log source 'SSM-Checkin'"
    }
} catch {
    Write-Warning "Unable to create Event Log source. Will continue with console output only. Error: $_"
    # Define a function to replace Write-EventLog when it's not available
    function Write-EventLog {
        param($LogName, $Source, $EventID, $Message)
        Write-Host "[$EventID] $Message"
    }
}

if ((gwmi win32_operatingsystem | select osarchitecture).osarchitecture -eq "64-bit")
{   
    # TODO: The whole environment should be self-contained and not rely on external URLs.
    # This URL should be replaced with a local copy of the installer.
	$downloadfile = "https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/windows_amd64/AmazonSSMAgentSetup.exe"
}
else
{
    # TODO: The whole environment should be self-contained and not rely on external URLs.
    # This URL should be replaced with a local copy of the installer.
	$downloadfile = "https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/windows_386/AmazonSSMAgentSetup.exe"	
}
if ( Test-Path "$ssmregfile" )
    {
            Write-EventLog -LogName Application -Source "SSM-Checkin" -EventID 1001 -Message "Already registered to SSM ."
    } 
else 
    {
    if (!(test-path $workingdir))
        {
            New-Item -ItemType Directory -Force -Path $workingdir
        }
    Write-EventLog -LogName Application -Source "SSM-Checkin" -EventID 1021 -Message "Begin Register to SSM for $env:computername"

    if ($versionMinimum -gt $PSVersionTable.PSVersion)
        {
            Write-EventLog -LogName Application -Source "SSM-Checkin" -EventID 1037 -Message "SSM Script requires Powershell 5.1 or later, aborting.."
        } 
    else 
        {
            push-location $workingdir
            [Environment]::CurrentDirectory = $PWD
            Write-EventLog -LogName Application -Source "SSM-Checkin" -EventID 1036 -Message "WorkingFolder $PWD"
            
            #Get API Response
            $response = Invoke-RestMethod -UseBasicParsing -Uri ($api+"?name="+$env:computername)
            Write-EventLog -LogName Application -Source "SSM-Checkin" -EventID 1039 -Message "Response:$response"
            $acode = $response.ActivationCode
            $aid = $response.ActivationId
            Write-EventLog -LogName Application -Source "SSM-Checkin" -EventID 1032 -Message "ActivationCode:$acode ActivationId:$aid"
            
            #Download and Install
            Write-EventLog -LogName Application -Source "SSM-Checkin" -EventID 1031 -Message "WorkingFolder $PWD DownloadFolder: $workingdir"
            New-Item -ItemType directory -Path $workingdir -Force
            (New-Object System.Net.WebClient).DownloadFile($downloadfile, $workingdir + "\AmazonSSMAgentSetup.exe")
            Start-Process $workingdir\AmazonSSMAgentSetup.exe -ArgumentList @("/quiet", "/log", "install.log","ALLOWEC2INSTALL=YES", "CODE=$acode", "ID=$aid", "REGION=$region") -Wait
            Write-EventLog -LogName Application -Source "SSM-Checkin" -EventID 1021 -Message "End Register to SSM."
			Start-Process -FilePath "C:\Program Files\Amazon\SSM\amazon-ssm-agent.exe" -ArgumentList '-fingerprint','-similarityThreshold 1'
			Write-EventLog -LogName Application -Source "SSM-Checkin" -EventID 1041 -Message "Configured similarityThreshold"
        }
    }