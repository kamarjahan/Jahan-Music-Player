'use client'
import { useSession, signIn, signOut } from "next-auth/react"
import { useEffect, useState } from "react"
import SpotifyPlayer from "react-spotify-web-playback"
import SpotifyWebApi from "spotify-web-api-node"
import { Play, Pause, SkipForward, SkipBack, Home, Search, Library, LogOut, Music2 } from "lucide-react"
import { motion } from "framer-motion"

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
})

export default function JahanMusicPlayer() {
  const { data: session } = useSession()
  const [view, setView] = useState('home') // home, search, library
  const [tracks, setTracks] = useState([])
  const [playingTrack, setPlayingTrack] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.accessToken) {
      spotifyApi.setAccessToken(session.user.accessToken)
      
      // Load "New Releases" as default dashboard data
      spotifyApi.getNewReleases({ limit: 10, offset: 0, country: 'US' })
        .then((data) => {
          setTracks(data.body.albums.items)
          setLoading(false)
        })
        .catch((err) => console.log("Something went wrong!", err))
    }
  }, [session])

  // --- COMPONENT: LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass p-8 rounded-2xl flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 bg-gradient-to-tr from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-900/50">
             <Music2 size={40} className="text-black" />
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-white">
            Jahan Player
          </h1>
          <p className="text-gray-400">Premium audio experience. Zero latency.</p>
          <button 
            onClick={() => signIn("spotify")}
            className="w-full py-4 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full transition-all transform hover:scale-105 shadow-xl"
          >
            Connect with Spotify
          </button>
        </motion.div>
      </div>
    )
  }

  // --- COMPONENT: TRACK CARD ---
  const TrackCard = ({ track }) => (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={() => setPlayingTrack(track.uri)}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
    >
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
        <img 
          src={track.images[0]?.url} 
          alt={track.name} 
          className="w-full h-full object-cover rounded-lg shadow-md"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
          <Play size={20} className="text-white fill-current" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium truncate text-sm sm:text-base">{track.name}</h3>
        <p className="text-gray-400 text-xs sm:text-sm truncate">{track.artists[0].name}</p>
      </div>
    </motion.div>
  )

  // --- MAIN UI ---
  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* Header / Mobile Top Bar */}
      <header className="h-16 glass-nav flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-2">
          <Music2 className="text-jahan-accent" />
          <span className="font-bold hidden sm:block">Jahan Player</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full border border-white/20" />
            <span className="text-sm font-medium hidden sm:block">{session.user.name}</span>
          </div>
          <button onClick={() => signOut()} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-32 hide-scrollbar relative">
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
          
          {/* Hero Section */}
          <section className="mb-8 p-6 rounded-3xl bg-gradient-to-b from-green-900/40 to-black border border-white/5 relative overflow-hidden">
             <div className="relative z-10">
               <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
               <p className="text-gray-400 text-sm">Jump back into your high-fidelity stream.</p>
             </div>
             <div className="absolute -top-20 -right-20 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
          </section>

          {/* New Releases Grid */}
          <h2 className="text-xl font-bold mb-4 px-2">New Releases</h2>
          {loading ? (
             <div className="text-center py-10 text-gray-500 animate-pulse">Loading library...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {tracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Music Player Bar (Fixed Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-50">
        <div className="max-w-screen-xl mx-auto">
          {session?.user?.accessToken && (
            <SpotifyPlayer
              token={session.user.accessToken}
              showSaveIcon
              callback={state => {
                if (!state.isPlaying) setLoading(false)
              }}
              play={playingTrack}
              uris={playingTrack ? [playingTrack] : []}
              styles={{
                activeColor: '#1DB954',
                bgColor: '#0a0a0a',
                color: '#fff',
                loaderColor: '#1DB954',
                sliderColor: '#1DB954',
                trackArtistColor: '#ccc',
                trackNameColor: '#fff',
                height: '80px', // Mobile friendly height
                sliderHandleColor: '#fff',
              }}
            />
          )}
        </div>
      </div>

    </div>
  )
}