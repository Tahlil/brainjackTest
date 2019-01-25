param (
    [string]$src    
)
$StartUpPath="$Env:USERPROFILE\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup"
$SrcFile = Split-Path "$src" -leaf
$DestinationFile = Join-Path -Path "$StartUpPath" -ChildPath "$SrcFile"
$SrcFileExist = Test-Path "$src" -PathType Leaf
$DestinationFileExist = Test-Path "$DestinationFile" -PathType Leaf

if($SrcFileExist -and (-Not $DestinationFileExist) ){
    New-Item -ItemType SymbolicLink -Path "$StartUpPath" -Name "$SrcFile" -Value "$src"
}
else{
    if($DestinationFileExist){
        Write-Warning "File $SrcFile already Exists in $StartUpPath"
    }
    if(-Not $SrcFileExist){
        Write-Warning "Src File does not exist"
    }
}