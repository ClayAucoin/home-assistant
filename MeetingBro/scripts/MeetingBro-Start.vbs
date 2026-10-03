Option Explicit

Dim shell
Dim backendDir
Dim frontendDir
Dim backendExe
Dim frontendCommand

Set shell = CreateObject("WScript.Shell")

backendDir = "C:\Users\Administrator\projects\MeetingBro\app\backend"
frontendDir = "C:\Users\Administrator\projects\MeetingBro\app\frontend"
backendExe = backendDir & "\.venv\Scripts\meetingbro-backend.exe"

shell.CurrentDirectory = backendDir
shell.Run """" & backendExe & """", 0, False

WScript.Sleep 8000

shell.CurrentDirectory = frontendDir
frontendCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""Set-Location '" & frontendDir & "'; & npm.cmd run dev"""
shell.Run frontendCommand, 0, False