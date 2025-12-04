import NextAuth from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"
import SpotifyWebApi from "spotify-web-api-node"

// 1. Initialize Spotify API with your credentials
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
})

// 2. Helper function to refresh the token when it dies
async function refreshAccessToken(token) {
  try {
    spotifyApi.setAccessToken(token.accessToken)
    spotifyApi.setRefreshToken(token.refreshToken)

    const { body: refreshedToken } = await spotifyApi.refreshAccessToken()
    
    return {
      ...token,
      accessToken: refreshedToken.access_token,
      accessTokenExpires: Date.now() + refreshedToken.expires_in * 1000, 
      refreshToken: refreshedToken.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    }
  } catch (error) {
    console.error("Error refreshing access token", error)
    return { ...token, error: "RefreshAccessTokenError" }
  }
}

// 3. Scopes (Permissions)
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

// 4. Main Auth Handler
const handler = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      authorization: {
        params: { scope: scopes }, // We let NextAuth handle the redirect URI automatically now
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user }) {
      // A) Initial Sign In: Save the token and calculate expiry time
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          username: account.providerAccountId,
          accessTokenExpires: account.expires_at * 1000, // Convert to Milliseconds
        }
      }

      // B) Return previous token if it has not expired yet
      if (Date.now() < token.accessTokenExpires) {
        return token
      }

      // C) Access token has expired, try to update it
      console.log("Token expired, refreshing...")
      return await refreshAccessToken(token)
    },

    async session({ session, token }) {
      session.user.accessToken = token.accessToken
      session.user.refreshToken = token.refreshToken
      session.user.username = token.username
      session.error = token.error
      return session
    },
  },
})

export { handler as GET, handler as POST }
