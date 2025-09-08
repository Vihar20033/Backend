# Backend with MERN


🔑 Access Token

What it is:
A short-lived token (like a digital key) used to access protected resources (APIs, user data, etc.).

Lifetime:
Usually short (minutes to hours).

Purpose:
Sent along with API requests in headers (e.g., Authorization: Bearer <token>).

Example use case:
When you log into a website, the site uses your access token to fetch your profile, posts, etc.

🔄 Refresh Token

What it is:
A long-lived token used to get a new access token after the old one expires.

Lifetime:
Much longer (days, weeks, or even indefinite if not revoked).

Purpose:
Not sent with every request—only used to request a new access token when it expires.

Example use case:
You don’t want to log in again every 30 minutes. So your refresh token silently gets a new access token without making you re-enter your credentials.