Set shell = CreateObject("WScript.Shell")

shell.CurrentDirectory = "C:\Users\Administrator\projects\MeetingBro\app\backend"

shell.Run """C:\Users\Administrator\projects\MeetingBro\app\backend\.venv\Scripts\meetingbro-backend.exe""", 0, False