'use client'
import { useState, useEffect } from "react"
import { Monitor, Smartphone, Speaker, Check } from "lucide-react"

export default function DeviceSelector({ spotifyApi, accessToken, onClose }) {
  const [devices, setDevices] = useState([])

  useEffect(() => {
    if (!accessToken) return
    spotifyApi.getMyDevices().then((data) => {
      setDevices(data.body.devices)
    })
  }, [accessToken, spotifyApi])

  const switchDevice = (deviceId) => {
    spotifyApi.transferMyPlayback([deviceId]).then(() => {
        if(onClose) onClose()
    })
  }

  return (
    <div className="absolute bottom-24 right-4 bg-[#282828] p-4 rounded-xl shadow-2xl border border-white/10 w-64 z-50">
      <h3 className="text-white font-bold mb-3 text-sm">Connect to a device</h3>
      <div className="space-y-2">
        {devices.map((device) => (
          <button
            key={device.id}
            onClick={() => switchDevice(device.id)}
            className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-white/10 transition ${device.is_active ? 'text-[#1DB954]' : 'text-gray-300'}`}
          >
            <div className="flex items-center gap-3">
              {device.type.toLowerCase() === 'smartphone' ? <Smartphone size={18} /> : 
               device.type.toLowerCase() === 'computer' ? <Monitor size={18} /> : <Speaker size={18} />}
              <span className="text-sm font-medium truncate">{device.name}</span>
            </div>
            {device.is_active && <Check size={16} />}
          </button>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/10">
         <p className="text-[10px] text-gray-500 text-center">Don't see your device? Open Spotify on it.</p>
      </div>
    </div>
  )
}