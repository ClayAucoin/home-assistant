Set shell = CreateObject("WScript.Shell")

WScript.Sleep 8000

shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ""Set-Location 'C:\Users\Administrator\projects\MeetingBro\app\frontend'; & npm.cmd run dev""", 0, False