'use client'
import { useSession, signIn, signOut } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import SpotifyPlayer from "react-spotify-web-playback"
import SpotifyWebApi from "spotify-web-api-node"
import { Play, Pause, Home, Search, Library, LogOut, Music2, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Initialize API wrapper
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
})

export default function JahanMusicPlayer() {
  const { data: session } = useSession()
  const [view, setView] = useState('home') // 'home', 'search', 'library'
  const [tracks, setTracks] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [playingTrack, setPlayingTrack] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    if (session?.user?.accessToken) {
      spotifyApi.setAccessToken(session.user.accessToken)
      
      // Load "New Releases" for Home View
      spotifyApi.getNewReleases({ limit: 20, country: 'US' })
        .then((data) => {
          setTracks(data.body.albums.items)
          setLoading(false)
        })
        .catch((err) => console.log("Error loading new releases:", err))
    }
  }, [session])

  // --- 2. SEARCH FUNCTION ---
  // Debounce search to avoid hitting API limit while typing
  useEffect(() => {
    if (!searchQuery) return setSearchResults([])
    if (!session?.user?.accessToken) return

    const timeoutId = setTimeout(() => {
      spotifyApi.searchTracks(searchQuery)
        .then(data => {
          setSearchResults(data.body.tracks.items)
        })
        .catch(err => console.error(err))
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [searchQuery, session])

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-black to-black z-0"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass p-8 rounded-3xl flex flex-col items-center gap-8 relative z-10 border border-white/10"
        >
          <div className="w-24 h-24 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.3)]">
             <Music2 size={48} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 mb-2">
              Jahan
            </h1>
            <p className="text-gray-400 font-light tracking-wide">Pro Fidelity Audio Player</p>
          </div>
          <button 
            onClick={() => signIn("spotify")}
            className="w-full py-4 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full transition-all transform hover:scale-[1.02] shadow-xl flex items-center justify-center gap-3"
          >
            <span>Connect Spotify</span>
          </button>
        </motion.div>
      </div>
    )
  }

  // --- COMPONENT: TRACK CARD ---
  const TrackCard = ({ track, isAlbum = false }) => (
    <motion.div 
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setPlayingTrack(track.uri)}
      className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border border-transparent hover:border-white/5"
    >
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
        <img 
          src={isAlbum ? track.images[0]?.url : track.album?.images[0]?.url} 
          alt={track.name} 
          className="w-full h-full object-cover rounded-lg shadow-lg"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
          <Play size={24} className="text-white fill-current" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium truncate text-sm sm:text-base">{track.name}</h3>
        <p className="text-gray-400 text-xs sm:text-sm truncate">
          {isAlbum ? track.artists[0].name : track.artists.map(a => a.name).join(', ')}
        </p>
      </div>
    </motion.div>
  )

  // --- MAIN UI ---
  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="w-64 bg-black border-r border-white/5 hidden md:flex flex-col p-6 gap-6 z-20">
        <div className="flex items-center gap-3 px-2">
          <Music2 className="text-[#1DB954]" size={28} />
          <span className="font-bold text-xl tracking-tight">Jahan</span>
        </div>
        
        <nav className="flex flex-col gap-2">
          <button onClick={() => setView('home')} className={`flex items-center gap-4 p-3 rounded-lg transition-all ${view === 'home' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Home size={20} /> <span className="font-medium">Home</span>
          </button>
          <button onClick={() => setView('search')} className={`flex items-center gap-4 p-3 rounded-lg transition-all ${view === 'search' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Search size={20} /> <span className="font-medium">Search</span>
          </button>
          <button onClick={() => setView('library')} className={`flex items-center gap-4 p-3 rounded-lg transition-all ${view === 'library' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Library size={20} /> <span className="font-medium">Library</span>
          </button>
        </nav>

        <div className="mt-auto border-t border-white/10 pt-6">
           <button onClick={() => signOut()} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm font-medium">
             <LogOut size={18} /> Sign Out
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col relative h-full">
        
        {/* MOBILE HEADER */}
        <header className="md:hidden h-16 glass-nav flex items-center justify-between px-4 z-30 sticky top-0">
          <Music2 className="text-[#1DB954]" />
          <div className="flex gap-4">
             <button onClick={() => setView('search')}><Search className="text-white" /></button>
             <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-32 p-4 sm:p-8 hide-scrollbar">
          
          {/* --- VIEW: HOME --- */}
          {view === 'home' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              {/* Hero Banner */}
              <div className="rounded-3xl bg-gradient-to-r from-green-900 to-black p-8 sm:p-12 relative overflow-hidden border border-white/5">
                <div className="relative z-10">
                  <span className="text-green-400 text-xs font-bold uppercase tracking-wider mb-2 block">Premium</span>
                  <h1 className="text-3xl sm:text-5xl font-bold mb-4">Good Afternoon</h1>
                  <p className="text-gray-300 max-w-lg">Your personalized stream is ready. Dive back into the music you love with zero latency.</p>
                </div>
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-green-500/20 rounded-full blur-3xl"></div>
              </div>

              {/* New Releases Grid */}
              <div>
                <h2 className="text-2xl font-bold mb-6">New Releases</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {tracks.map((track) => (
                    <TrackCard key={track.id} track={track} isAlbum={true} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* --- VIEW: SEARCH --- */}
          {view === 'search' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="sticky top-0 bg-black/80 backdrop-blur-xl p-2 z-20 -mx-4 px-4 sm:static sm:bg-transparent sm:p-0">
                <div className="relative max-w-2xl mx-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="What do you want to listen to?" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#242424] text-white py-4 pl-12 pr-4 rounded-full focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder-gray-500 font-medium"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-w-4xl mx-auto">
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {searchResults.map((track) => (
                       <TrackCard key={track.id} track={track} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 mt-20">
                    <p>Search for artists, songs, or podcasts</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

           {/* --- VIEW: LIBRARY (Placeholder) --- */}
           {view === 'library' && (
             <div className="flex flex-col items-center justify-center h-full text-gray-500">
               <Library size={48} className="mb-4 opacity-50"/>
               <p>Your library is empty.</p>
             </div>
           )}

        </main>
      </div>

      {/* PLAYER BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 z-50 shadow-2xl">
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
                bgColor: '#000000',
                color: '#fff',
                loaderColor: '#1DB954',
                sliderColor: '#1DB954',
                trackArtistColor: '#999',
                trackNameColor: '#fff',
                height: '80px',
              }}
            />
          )}
        </div>
      </div>
      
      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-20 left-4 right-4 bg-white/10 glass backdrop-blur-md rounded-2xl flex justify-around p-4 z-40 border border-white/5">
         <button onClick={() => setView('home')} className={view === 'home' ? 'text-white' : 'text-gray-400'}><Home /></button>
         <button onClick={() => setView('search')} className={view === 'search' ? 'text-white' : 'text-gray-400'}><Search /></button>
         <button onClick={() => setView('library')} className={view === 'library' ? 'text-white' : 'text-gray-400'}><Library /></button>
      </div>

    </div>
  )
}