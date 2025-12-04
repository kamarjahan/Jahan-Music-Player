'use client'
import { useSession, signIn, signOut } from "next-auth/react"
import { useEffect, useState, useRef, useCallback } from "react"
import SpotifyPlayer from "react-spotify-web-playback"
import SpotifyWebApi from "spotify-web-api-node"
import { 
  Play, Pause, Home, Search, Library, LogOut, Music2, 
  Loader2, Shuffle, Repeat, ChevronLeft, Download, Smartphone,
  History, Sparkles
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
})

export default function JahanMusicPlayer() {
  const { data: session } = useSession()
  const [view, setView] = useState('home') 
  
  // Data States
  const [newReleases, setNewReleases] = useState([])
  const [recentlyPlayed, setRecentlyPlayed] = useState([]) // <--- NEW
  const [recommendations, setRecommendations] = useState([]) // <--- NEW
  
  const [playlists, setPlaylists] = useState([])
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [playlistTracks, setPlaylistTracks] = useState([])
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchOffset, setSearchOffset] = useState(0)
  const [hasMoreResults, setHasMoreResults] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  
  // Player Controls
  const [playingTrack, setPlayingTrack] = useState(null)
  const [playingTrackDetails, setPlayingTrackDetails] = useState(null) // <--- To store current song info
  const [isShuffle, setIsShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState('off')
  
  // PWA Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallModal, setShowInstallModal] = useState(false)

  // Infinite Scroll Ref
  const observer = useRef()
  const lastTrackElementRef = useCallback(node => {
    if (isSearching) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreResults && searchQuery.length >= 3) {
        setSearchOffset(prev => prev + 20)
      }
    })
    if (node) observer.current.observe(node)
  }, [isSearching, hasMoreResults, searchQuery])

  // --- 1. PWA INSTALL LISTENER ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallModal(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstallModal(false)
    }
  }

  // --- 2. INITIAL DATA LOADING ---
  useEffect(() => {
    if (session?.user?.accessToken) {
      spotifyApi.setAccessToken(session.user.accessToken)
      
      // A) Get New Releases
      spotifyApi.getNewReleases({ limit: 10, country: 'US' })
        .then(data => setNewReleases(data.body.albums.items))
      
      // B) Get User Playlists
      spotifyApi.getUserPlaylists().then(data => setPlaylists(data.body.items))

      // C) Get Recently Played (NEW)
      spotifyApi.getMyRecentlyPlayedTracks({ limit: 10 })
        .then(data => setRecentlyPlayed(data.body.items.map(item => item.track)))
    }
  }, [session])

  // --- 3. SMART RECOMMENDATIONS (NEW) ---
  useEffect(() => {
    if (!playingTrack || !session?.user?.accessToken) return;

    // We need the Track ID (not URI) to fetch recommendations
    // URI format: "spotify:track:123456" -> Split to get "123456"
    const trackId = playingTrack.replace('spotify:track:', '');

    if (trackId && !trackId.includes(':')) {
       // Fetch 5 songs similar to the current one
       spotifyApi.getRecommendations({ seed_tracks: [trackId], limit: 5 })
         .then(data => setRecommendations(data.body.tracks))
         .catch(e => console.log("Recommendation error:", e))
    }
  }, [playingTrack, session])

  // --- 4. PLAYER CONTROLS ---
  const toggleShuffle = () => {
    const newState = !isShuffle
    setIsShuffle(newState)
    spotifyApi.setShuffle(newState).catch(e => console.error(e))
  }

  const toggleRepeat = () => {
    const modes = ['off', 'context', 'track']
    const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length
    const newMode = modes[nextIndex]
    setRepeatMode(newMode)
    spotifyApi.setRepeat(newMode).catch(e => console.error(e))
  }

  const playContext = (uri) => {
    setPlayingTrack(uri)
  }

  const openPlaylist = async (playlist) => {
    setSelectedPlaylist(playlist)
    setView('playlist_detail')
    try {
      const data = await spotifyApi.getPlaylistTracks(playlist.id)
      setPlaylistTracks(data.body.items)
    } catch (err) {
      console.error(err)
    }
  }

  // --- 5. SEARCH LOGIC ---
  useEffect(() => {
    if (!session?.user?.accessToken || searchQuery.length < 3) return
    const timeoutId = setTimeout(() => {
      setIsSearching(true)
      spotifyApi.searchTracks(searchQuery, { limit: 20, offset: searchOffset })
        .then(data => {
          setSearchResults(prev => searchOffset === 0 ? data.body.tracks.items : [...prev, ...data.body.tracks.items])
          setHasMoreResults(data.body.tracks.items.length === 20)
          setIsSearching(false)
        })
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchOffset, session])


  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-black to-black z-0"></div>
        <div className="z-10 text-center">
            <h1 className="text-5xl font-bold mb-6">Jahan Music</h1>
            <button onClick={() => signIn("spotify")} className="px-8 py-4 bg-[#1DB954] text-black font-bold rounded-full hover:scale-105 transition">Connect Spotify</button>
        </div>
      </div>
    )
  }

  // --- MAIN UI ---
  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      
      {/* PWA INSTALL MODAL */}
      <AnimatePresence>
        {showInstallModal && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-4 right-4 z-[100] bg-[#1DB954] text-black p-4 rounded-xl shadow-2xl flex items-center gap-4 max-w-sm cursor-pointer"
            onClick={handleInstallClick}
          >
            <div className="bg-black/10 p-2 rounded-full"><Smartphone size={24}/></div>
            <div>
              <h3 className="font-bold text-sm">Install Jahan App</h3>
              <p className="text-xs opacity-80">Better performance on Phone & PC</p>
            </div>
            <button onClick={(e) => {e.stopPropagation(); setShowInstallModal(false)}}><div className="bg-black/10 p-1 rounded-full"><span className="text-lg font-bold">×</span></div></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside className="w-64 bg-black border-r border-white/5 hidden md:flex flex-col p-6 gap-6 z-20">
        <div className="flex items-center gap-3"><Music2 className="text-[#1DB954]" size={28} /><span className="font-bold text-xl">Jahan</span></div>
        <nav className="flex flex-col gap-2">
          {['home', 'search', 'library'].map((item) => (
             <button key={item} onClick={() => setView(item)} className={`flex items-center gap-4 p-3 rounded-lg capitalize ${view === item ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
               {item === 'home' ? <Home size={20}/> : item === 'search' ? <Search size={20}/> : <Library size={20}/>}
               {item}
             </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* HEADER */}
        <header className="md:hidden h-16 glass-nav flex items-center justify-between px-4 sticky top-0 z-30">
          <Music2 className="text-[#1DB954]" />
          <div className="flex gap-4"><Search onClick={() => setView('search')} /><img src={session.user.image} className="w-8 h-8 rounded-full" /></div>
        </header>

        <main className="flex-1 overflow-y-auto pb-32 p-4 sm:p-8 hide-scrollbar">
          
          {/* HOME VIEW (UPDATED) */}
          {view === 'home' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              
              {/* 1. Recommendation Section (Dynamic) */}
              {recommendations.length > 0 && (
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                     <Sparkles className="text-[#1DB954]" size={20}/>
                     <h2 className="text-xl font-bold">Because you're listening</h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
                    {recommendations.map(track => (
                      <div key={track.id} onClick={() => setPlayingTrack(track.uri)} className="min-w-[140px] w-[140px] bg-white/5 p-3 rounded-xl hover:bg-white/10 cursor-pointer transition group">
                        <div className="relative mb-2">
                           <img src={track.album.images[0]?.url} className="rounded-md shadow-lg aspect-square object-cover"/>
                           <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-md"><Play fill="white"/></div>
                        </div>
                        <p className="font-bold truncate text-sm">{track.name}</p>
                        <p className="text-xs text-gray-400 truncate">{track.artists[0].name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. New Releases */}
              <div>
                <h2 className="text-xl font-bold mb-4">New Releases</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {newReleases.map(track => (
                    <div key={track.id} onClick={() => setPlayingTrack(track.uri)} className="bg-white/5 p-3 rounded-xl hover:bg-white/10 cursor-pointer transition group">
                      <div className="relative mb-2">
                          <img src={track.images[0]?.url} className="rounded-md shadow-lg aspect-square object-cover"/>
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-md"><Play fill="white"/></div>
                      </div>
                      <p className="font-bold truncate text-sm">{track.name}</p>
                      <p className="text-sm text-gray-400 truncate">{track.artists[0].name}</p>
                    </div>
                  ))}
                </div>
              </div>

               {/* 3. Recently Played (Horizontal Scroll) */}
               {recentlyPlayed.length > 0 && (
                <div>
                   <div className="flex items-center gap-2 mb-4">
                     <History className="text-gray-400" size={20}/>
                     <h2 className="text-xl font-bold">Jump Back In</h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
                    {recentlyPlayed.map((track, i) => (
                      <div key={track.id + i} onClick={() => setPlayingTrack(track.uri)} className="min-w-[120px] w-[120px] cursor-pointer hover:opacity-80 transition">
                        <img src={track.album.images[0]?.url} className="rounded-md shadow-lg aspect-square object-cover mb-2"/>
                        <p className="font-medium truncate text-xs text-gray-300">{track.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* PLAYLIST DETAIL VIEW */}
          {view === 'playlist_detail' && selectedPlaylist && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button onClick={() => setView('library')} className="mb-4 flex items-center text-gray-400 hover:text-white"><ChevronLeft/> Back</button>
              <div className="flex flex-col md:flex-row gap-6 mb-8 items-center md:items-end">
                <img src={selectedPlaylist.images[0]?.url} className="w-48 h-48 sm:w-60 sm:h-60 rounded-lg shadow-2xl"/>
                <div className="flex-1 text-center md:text-left">
                  <p className="uppercase text-xs font-bold tracking-wider">Playlist</p>
                  <h1 className="text-3xl sm:text-5xl font-black mb-4 mt-2">{selectedPlaylist.name}</h1>
                  <p className="text-gray-400 mb-4">{selectedPlaylist.owner.display_name} • {playlistTracks.length} songs</p>
                  <div className="flex items-center gap-4 justify-center md:justify-start">
                    <button onClick={() => playContext(selectedPlaylist.uri)} className="w-14 h-14 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105 shadow-lg shadow-green-900/50 text-black">
                      <Play fill="black" size={28} className="ml-1"/>
                    </button>
                    <button onClick={toggleShuffle} className={`p-2 rounded-full transition ${isShuffle ? 'text-[#1DB954]' : 'text-gray-400 hover:text-white'}`}><Shuffle size={24} /></button>
                    <button onClick={toggleRepeat} className={`p-2 rounded-full transition relative ${repeatMode !== 'off' ? 'text-[#1DB954]' : 'text-gray-400 hover:text-white'}`}><Repeat size={24} />{repeatMode === 'track' && <span className="absolute top-1 right-0 text-[10px] font-bold bg-black px-1 rounded-full">1</span>}</button>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                {playlistTracks.map((item, index) => (
                  <div key={item.track.id + index} onClick={() => setPlayingTrack(item.track.uri)} className="flex items-center gap-4 p-3 rounded-md hover:bg-white/10 group cursor-pointer">
                    <span className="text-gray-500 w-6 text-center group-hover:hidden">{index + 1}</span>
                    <Play size={16} className="hidden group-hover:block w-6 text-white"/>
                    <img src={item.track.album.images[2]?.url} className="w-10 h-10 rounded"/>
                    <div className="flex-1 min-w-0">
                      <p className={`truncate font-medium ${playingTrack === item.track.uri ? 'text-[#1DB954]' : 'text-white'}`}>{item.track.name}</p>
                      <p className="truncate text-sm text-gray-400">{item.track.artists[0].name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* LIBRARY VIEW */}
          {view === 'library' && (
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
               {playlists.map(playlist => (
                 <div key={playlist.id} onClick={() => openPlaylist(playlist)} className="bg-[#181818] p-4 rounded-lg hover:bg-[#282828] transition cursor-pointer">
                   <img src={playlist.images[0]?.url} className="w-full aspect-square object-cover rounded-md mb-4 shadow-lg"/>
                   <h3 className="font-bold truncate">{playlist.name}</h3>
                   <p className="text-sm text-gray-400">By {playlist.owner.display_name}</p>
                 </div>
               ))}
             </div>
          )}

          {/* SEARCH VIEW */}
          {view === 'search' && (
             <div className="space-y-6">
               <input 
                  type="text" 
                  placeholder="Search songs..." 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); if(e.target.value.length >= 3 && searchOffset !== 0) { setSearchOffset(0); setSearchResults([]) } }}
                  className="w-full bg-[#242424] py-4 px-6 rounded-full text-white focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
                  autoFocus
               />
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                 {searchResults.map((track, i) => (
                   <div key={i} ref={i === searchResults.length - 1 ? lastTrackElementRef : null} onClick={() => setPlayingTrack(track.uri)} className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-md cursor-pointer">
                     <img src={track.album.images[2]?.url} className="w-12 h-12 rounded"/>
                     <div>
                       <p className="font-medium truncate text-white">{track.name}</p>
                       <p className="text-sm text-gray-400 truncate">{track.artists[0].name}</p>
                     </div>
                   </div>
                 ))}
               </div>
               {isSearching && <div className="flex justify-center p-4"><Loader2 className="animate-spin text-[#1DB954]"/></div>}
             </div>
          )}

        </main>
      </div>

      {/* PLAYER BAR */}
      <div className="fixed bottom-0 w-full bg-black border-t border-white/10 z-50">
        {session?.user?.accessToken && (
            <SpotifyPlayer
              token={session.user.accessToken}
              play={playingTrack ? true : false}
              uris={playingTrack ? [playingTrack] : []}
              showSaveIcon
              callback={state => {
                 // Update local state when track changes to trigger Recommendations
                 if(state.track?.id) {
                     // Only update if it's a NEW track to avoid infinite re-renders
                     if(!playingTrack || !playingTrack.includes(state.track.id)) {
                        // We don't setPlayingTrack here to avoid loop, 
                        // but we could use a separate state to track "Current Playing ID" for recommendations
                     }
                 }
              }}
              styles={{
                activeColor: '#1DB954',
                bgColor: '#000',
                color: '#fff',
                loaderColor: '#1DB954',
                sliderColor: '#1DB954',
                trackArtistColor: '#ccc',
                trackNameColor: '#fff',
                height: '80px',
              }}
            />
        )}
      </div>
      
      {/* MOBILE NAV */}
      <div className="md:hidden fixed bottom-24 w-[90%] left-[5%] bg-white/10 backdrop-blur-md rounded-2xl flex justify-around p-4 z-40 border border-white/5">
         <button onClick={() => setView('home')} className={view === 'home' ? 'text-[#1DB954]' : 'text-gray-400'}><Home/></button>
         <button onClick={() => setView('search')} className={view === 'search' ? 'text-[#1DB954]' : 'text-gray-400'}><Search/></button>
         <button onClick={() => setView('library')} className={view === 'library' ? 'text-[#1DB954]' : 'text-gray-400'}><Library/></button>
      </div>
    </div>
  )
}