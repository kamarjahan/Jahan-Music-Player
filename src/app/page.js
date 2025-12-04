'use client'
import { useSession, signIn, signOut } from "next-auth/react"
import { useEffect, useState, useRef, useCallback } from "react"
import SpotifyPlayer from "react-spotify-web-playback"
import SpotifyWebApi from "spotify-web-api-node"
import { Play, Pause, Home, Search, Library, LogOut, Music2, Menu, X, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Initialize API wrapper
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
})

export default function JahanMusicPlayer() {
  const { data: session } = useSession()
  const [view, setView] = useState('home') // 'home', 'search', 'library'
  
  // Data States
  const [newReleases, setNewReleases] = useState([])
  const [playlists, setPlaylists] = useState([])
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchOffset, setSearchOffset] = useState(0)
  const [hasMoreResults, setHasMoreResults] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  
  // Player States
  const [playingTrack, setPlayingTrack] = useState(null) // Can be a track URI or Playlist URI
  const [loading, setLoading] = useState(true)

  // Infinite Scroll Observer
  const observer = useRef()
  const lastTrackElementRef = useCallback(node => {
    if (isSearching) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreResults && searchQuery.length >= 3) {
        setSearchOffset(prevOffset => prevOffset + 20)
      }
    })
    if (node) observer.current.observe(node)
  }, [isSearching, hasMoreResults, searchQuery])

  // --- 1. INITIAL SETUP & TOKEN ---
  useEffect(() => {
    if (session?.user?.accessToken) {
      spotifyApi.setAccessToken(session.user.accessToken)
      
      // Load Home Data
      spotifyApi.getNewReleases({ limit: 20, country: 'US' })
        .then(data => {
          setNewReleases(data.body.albums.items)
          setLoading(false)
        })

      // Load Library (Playlists)
      spotifyApi.getUserPlaylists()
        .then(data => {
          setPlaylists(data.body.items)
        })
    }
  }, [session])

  // --- 2. REAL-TIME SEARCH LOGIC (DEBOUNCED) ---
  useEffect(() => {
    if (!session?.user?.accessToken) return
    
    // Clear results if query is too short
    if (searchQuery.length < 3) {
      setSearchResults([])
      setSearchOffset(0)
      return
    }

    // Debounce: Wait 500ms before triggering new search to save API calls
    const timeoutId = setTimeout(() => {
      setIsSearching(true)
      // If offset is 0, it's a fresh search. If > 0, it's loading more.
      spotifyApi.searchTracks(searchQuery, { limit: 20, offset: searchOffset })
        .then(data => {
          setSearchResults(prev => {
            return searchOffset === 0 
              ? data.body.tracks.items 
              : [...prev, ...data.body.tracks.items]
          })
          setHasMoreResults(data.body.tracks.items.length === 20)
          setIsSearching(false)
        })
        .catch(err => {
          console.error(err)
          setIsSearching(false)
        })
    }, 500) 

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchOffset, session])

  // Reset offset when typing a NEW query
  const handleSearchInput = (e) => {
    setSearchQuery(e.target.value)
    if(e.target.value.length >= 3) {
       // Only reset list if we are starting a radically new search
       if (searchOffset !== 0) {
         setSearchOffset(0)
         setSearchResults([])
       }
    }
  }

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 relative overflow-hidden">
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

  // --- REUSABLE TRACK/PLAYLIST CARD ---
  const MediaCard = ({ item, type = 'track', isLast = false }) => (
    <motion.div 
      ref={isLast ? lastTrackElementRef : null}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setPlayingTrack(item.uri)}
      className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border border-transparent hover:border-white/5"
    >
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
        <img 
          src={item.images?.[0]?.url || item.album?.images?.[0]?.url} 
          alt={item.name} 
          className="w-full h-full object-cover rounded-lg shadow-lg"
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
          <Play size={24} className="text-white fill-current" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium truncate text-sm sm:text-base">{item.name}</h3>
        <p className="text-gray-400 text-xs sm:text-sm truncate">
          {type === 'playlist' ? `By ${item.owner.display_name}` : item.artists[0].name}
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
          {['home', 'search', 'library'].map((navItem) => (
             <button 
               key={navItem}
               onClick={() => setView(navItem)} 
               className={`flex items-center gap-4 p-3 rounded-lg transition-all capitalize ${view === navItem ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
             >
               {navItem === 'home' && <Home size={20} />}
               {navItem === 'search' && <Search size={20} />}
               {navItem === 'library' && <Library size={20} />}
               <span className="font-medium">{navItem}</span>
             </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-6">
           <button onClick={() => signOut()} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors text-sm font-medium">
             <LogOut size={18} /> Sign Out
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative h-full">
        
        {/* MOBILE HEADER */}
        <header className="md:hidden h-16 glass-nav flex items-center justify-between px-4 z-30 sticky top-0">
          <Music2 className="text-[#1DB954]" />
          <div className="flex gap-4">
             <button onClick={() => setView('search')}><Search className="text-white" /></button>
             <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-32 p-4 sm:p-8 hide-scrollbar scroll-smooth">
          
          {/* --- VIEW: HOME --- */}
          {view === 'home' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="rounded-3xl bg-gradient-to-r from-green-900 to-black p-8 sm:p-12 relative overflow-hidden border border-white/5">
                <div className="relative z-10">
                  <span className="text-green-400 text-xs font-bold uppercase tracking-wider mb-2 block">Premium</span>
                  <h1 className="text-3xl sm:text-5xl font-bold mb-4">Good Afternoon</h1>
                  <p className="text-gray-300 max-w-lg">Jahan Music Player is connected. High fidelity streaming active.</p>
                </div>
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-green-500/20 rounded-full blur-3xl"></div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-6">New Releases</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {newReleases.map((track) => (
                    <MediaCard key={track.id} item={track} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* --- VIEW: SEARCH (With Infinite Scroll) --- */}
          {view === 'search' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="sticky top-0 bg-black/80 backdrop-blur-xl p-2 z-20 -mx-4 px-4 sm:static sm:bg-transparent sm:p-0">
                <div className="relative max-w-2xl mx-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Type at least 3 letters to search..." 
                    value={searchQuery}
                    onChange={handleSearchInput}
                    className="w-full bg-[#242424] text-white py-4 pl-12 pr-4 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1DB954] transition-all placeholder-gray-500 font-medium"
                    autoFocus
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1DB954] animate-spin" size={20} />
                  )}
                </div>
              </div>

              <div className="max-w-4xl mx-auto">
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-10">
                    {searchResults.map((track, index) => (
                       <MediaCard 
                          key={track.id + index} 
                          item={track} 
                          isLast={index === searchResults.length - 1} 
                       />
                    ))}
                    {/* Loading indicator at bottom for infinite scroll */}
                    {isSearching && searchOffset > 0 && (
                      <div className="col-span-full flex justify-center p-4">
                        <Loader2 className="text-[#1DB954] animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 mt-20">
                    {searchQuery.length > 0 && searchQuery.length < 3 ? (
                      <p>Keep typing...</p>
                    ) : (
                      <p>Search for artists, songs, or podcasts</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

           {/* --- VIEW: LIBRARY (Playlists) --- */}
           {view === 'library' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
               <h2 className="text-2xl font-bold mb-6">Your Library</h2>
               {playlists.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                   {playlists.map((playlist) => (
                     <MediaCard key={playlist.id} item={playlist} type="playlist" />
                   ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                   <Library size={48} className="mb-4 opacity-50"/>
                   <p>No playlists found or loading...</p>
                 </div>
               )}
             </motion.div>
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
              play={playingTrack ? true : false}
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
         <button onClick={() => setView('home')} className={view === 'home' ? 'text-[#1DB954]' : 'text-gray-400'}><Home /></button>
         <button onClick={() => setView('search')} className={view === 'search' ? 'text-[#1DB954]' : 'text-gray-400'}><Search /></button>
         <button onClick={() => setView('library')} className={view === 'library' ? 'text-[#1DB954]' : 'text-gray-400'}><Library /></button>
      </div>

    </div>
  )
}