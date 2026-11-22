[CmdletBinding()]
param([switch]$SkipDocker,[switch]$SkipJava)
# Compatibilidad: redirige al iniciador seguro. No termina procesos existentes.
& "$PSScriptRoot\start-services.ps1" @PSBoundParameters
