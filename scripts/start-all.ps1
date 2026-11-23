[CmdletBinding()]
param([switch]$SkipDocker,[switch]$SkipJava)
# Punto de entrada compatible: usa la estructura actual y no termina procesos existentes.
& "$PSScriptRoot\start-services.ps1" @PSBoundParameters
