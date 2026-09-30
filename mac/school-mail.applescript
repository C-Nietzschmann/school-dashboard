-- School mail -> your A Level dashboard.
--
-- An Apple Mail rule runs this for the emails it picks (your school's address,
-- Google Classroom, a teacher who writes from a private address). For each one
-- it sends the subject, the sender, the date and the first 4,000 characters of
-- the text to your dashboard, which keeps it until your hourly reader has put
-- what matters onto it: homework, tests, deadlines, important notices.
-- Nothing else leaves your Mac, and nothing gets into your mailbox.
--
-- It needs ~/.school-dashboard-mail, two lines:
--   the address:  https://<your dashboard>/api/mail
--   the mail key: shown on the dashboard's Files tab (it can only hand emails in)
-- The Files tab's "School mail from your Mac" card gives the commands to set it up.
using terms from application "Mail"
	on perform mail action with messages theMessages for rule theRule
		set cfgPath to (POSIX path of (path to home folder)) & ".school-dashboard-mail"
		try
			set cfg to paragraphs of (read (POSIX file cfgPath))
		on error
			return
		end try
		if (count of cfg) < 2 then return
		set endpoint to my trim(item 1 of cfg)
		set mailKey to my trim(item 2 of cfg)
		repeat with m in theMessages
			try
				set theText to content of m
				if (length of theText) > 4000 then set theText to text 1 thru 4000 of theText
				set fields to {"id=" & (message id of m), "from=" & (sender of m), "subject=" & (subject of m), "date=" & my isoDate(date sent of m), "body=" & theText}
				-- a short timeout, so Mail is never held up for long when you are offline
				set cmd to "/usr/bin/curl -sS -m 10 -X POST " & quoted form of endpoint & " -H " & quoted form of ("Authorization: Bearer " & mailKey)
				repeat with f in fields
					set cmd to cmd & " --data-urlencode " & quoted form of (f as text)
				end repeat
				do shell script cmd
			end try
		end repeat
	end perform mail action with messages
end using terms from

on isoDate(d)
	set y to (year of d) as integer
	set mo to (month of d) as integer
	set dd to (day of d) as integer
	return (y as text) & "-" & (text -2 thru -1 of ("0" & mo)) & "-" & (text -2 thru -1 of ("0" & dd))
end isoDate

on trim(s)
	set t to s as text
	repeat while t begins with " " or t begins with tab or t begins with return
		if (length of t) is 1 then return ""
		set t to text 2 thru -1 of t
	end repeat
	repeat while t ends with " " or t ends with tab or t ends with return
		if (length of t) is 1 then return ""
		set t to text 1 thru -2 of t
	end repeat
	return t
end trim
