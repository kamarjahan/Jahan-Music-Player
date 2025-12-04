import NextAuth from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"

// 1. Define the permissions (Scopes) we need
const scopes = [
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "streaming", 
  "user-read-private",
  "user-library-read",
  "user-top-read",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-follow-read",
].join(" ")

// 2. Setup the Auth Handler
const handler = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      authorization: {
        params: {
          scope: scopes,
          // 3. NUCLEAR FIX: Force the correct URL here
          redirect_uri: "https://glowing-trout-wjqr76p69xg29vwp-3000.app.github.dev/api/auth/callback/spotify",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      // Save the access token to the cookie
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = account.expires_at * 1000
      }
      return token
    },
    async session({ session, token }) {
      // Pass the access token to the client
      session.user.accessToken = token.accessToken
      session.user.refreshToken = token.refreshToken
      return session
    },
  },
})

export { handler as GET, handler as POST }