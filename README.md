# close-the-window

A small useful thing that is also an exercise to learn webtask.io.

A work-from-home dilemma: In the summer, if the temperature is only excessive during the heat of the day, then it makes sense to open the windows at bedtime, and close them in the morning whenever the temperature exceeds the AC's setpoint. If it's cool for the first few hours of the day, it's good to be reminded to close the windows and have that rely on the actual temperature.

This task sends a text message when the temperature rises above the setpoint, and also sends an email when the temperature drops below it.

The current version uses two free APIs -- Weather Underground for the current temperature, and the free tier of Send Grid to send the email;  you need to register for an API key for each.  It also uses one paid API -- SMS messages from Textbelt.
