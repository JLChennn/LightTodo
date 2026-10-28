!macro customUnInstall
  ${ifNot} ${isUpdated}
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "io.github.jlchennn.lighttodo"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "io.github.jlchennn.lighttodo"
  ${endIf}
!macroend
