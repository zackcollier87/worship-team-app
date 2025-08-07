import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Event page displays the set list for a specific event. Users can add new
 * songs by providing a title, YouTube URL, and uploading a PDF. Songs are
 * stored in a separate `songs` collection and referenced on events by ID.
 */
export default function EventPage() {
  const router = useRouter();
  const { id } = router.query;
  const [event, setEvent] = useState(null);
  const [library, setLibrary] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongYoutube, setNewSongYoutube] = useState('');
  const [newSongFile, setNewSongFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Subscribe to the event document.
  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'events', id), (docSnap) => {
      setEvent({ id: docSnap.id, ...docSnap.data() });
    });
    return () => unsubscribe();
  }, [id]);

  // Subscribe to the songs collection.
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'songs'), (snapshot) => {
      const songs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLibrary(songs);
    });
    return () => unsubscribe();
  }, []);

  // Extract YouTube ID helper.
  const getYoutubeId = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'youtu.be') return urlObj.pathname.slice(1);
      const params = new URLSearchParams(urlObj.search);
      return params.get('v');
    } catch {
      return null;
    }
  };

  // Add existing song to event.
  const addSongToEvent = async (songId) => {
    if (!event || !songId) return;
    const current = event.songIds || [];
    if (current.includes(songId)) return;
    await updateDoc(doc(db, 'events', id), {
      songIds: [...current, songId],
    });
  };

  // Remove song from event but keep it in library.
  const removeSongFromEvent = async (songId) => {
    if (!event || !songId) return;
    const current = event.songIds || [];
    const updated = current.filter((sid) => sid !== songId);
    await updateDoc(doc(db, 'events', id), { songIds: updated });
  };

  // Create a brand-new song and link it to the event.
  const addNewSong = async () => {
    if (!newSongTitle || !event) return;
    setUploading(true);
    try {
      let pdfUrl = '';
      if (newSongFile) {
        const tempRef = ref(storage, `songs/${Date.now()}_${newSongFile.name}`);
        await uploadBytes(tempRef, newSongFile);
        pdfUrl = await getDownloadURL(tempRef);
      }
      const youtubeUrlValue = newSongYoutube.trim() || '';
      const songDoc = await addDoc(collection(db, 'songs'), {
        title: newSongTitle.trim(),
        youtubeUrl: youtubeUrlValue,
        pdfUrl,
      });
      await addSongToEvent(songDoc.id);
      setNewSongTitle('');
      setNewSongYoutube('');
      setNewSongFile(null);
      setSearchTerm('');
    } finally {
      setUploading(false);
    }
  };

  // Prepare lookup map for songs by ID.
  const songMap = {};
  library.forEach((s) => {
    songMap[s.id] = s;
  });

  // Filter library for search suggestions.
  const filtered = library.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      {event ? (
        <>
          <h1>{event.name}</h1>
          {/* Add from library */}
          <div style={{ marginBottom: '2rem' }}>
            <h2>Add Song from Library</h2>
            <input
              type="text"
              placeholder="Search songs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.5rem', width: '100%', marginBottom: '0.5rem' }}
            />
            {searchTerm && (
              <ul style={{ listStyle: 'none', padding: 0, maxHeight: '200px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px' }}>
                {filtered.map((song) => (
                  <li
                    key={song.id}
                    style={{ padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>{song.title}</span>
                    <button
                      onClick={() => addSongToEvent(song.id)}
                      disabled={event.songIds && event.songIds.includes(song.id)}
                      style={{ padding: '0.25rem 0.5rem' }}
                    >
                      {event.songIds && event.songIds.includes(song.id) ? 'Added' : 'Add'}
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li style={{ padding: '0.5rem' }}>No songs match your search.</li>
                )}
              </ul>
            )}
          </div>
          {/* Add new song */}
          <div style={{ marginBottom: '2rem' }}>
            <h2>Add New Song</h2>
            <div style={{ marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder="Song title"
                value={newSongTitle}
                onChange={(e) => setNewSongTitle(e.target.value)}
                style={{ padding: '0.5rem', marginRight: '0.5rem' }}
              />
              <input
                type="text"
                placeholder="YouTube URL"
                value={newSongYoutube}
                onChange={(e) => setNewSongYoutube(e.target.value)}
                style={{ padding: '0.5rem', marginRight: '0.5rem' }}
              />
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setNewSongFile(e.target.files[0])}
                style={{ marginBottom: '0.5rem' }}
              />
            </div>
            <button
              onClick={addNewSong}
              disabled={uploading}
              style={{ padding: '0.5rem 1rem' }}
            >
              {uploading ? 'Uploading...' : 'Add New Song'}
            </button>
          </div>
          {/* Set list */}
          <h2>Set List</h2>
          {event.songIds && event.songIds.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {event.songIds.map((sid) => {
                const song = songMap[sid];
                if (!song) return null;
                const vidId = getYoutubeId(song.youtubeUrl);
                const thumbnail = vidId
                  ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`
                  : null;
                return (
                  <li key={sid} style={{ marginBottom: '2rem' }}>
                    <h3>{song.title}</h3>
                    <button
                      onClick={() => removeSongFromEvent(sid)}
                      style={{ marginBottom: '0.5rem', padding: '0.25rem 0.5rem' }}
                    >
                      Remove
                    </button>
                    {thumbnail && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <img
                          src={thumbnail}
                          alt={`${song.title} thumbnail`}
                          style={{ width: '200px', height: 'auto' }}
                        />
                      </div>
                    )}
                    {song.pdfUrl && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <a
                          href={song.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#0070f3' }}
                        >
                          PDF
                        </a>
                      </div>
                    )}
                    {vidId && (
                      <div style={{ maxWidth: '560px' }}>
                        <iframe
                          width="560"
                          height="315"
                          src={`https://www.youtube.com/embed/${vidId}`}
                          title={song.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        ></iframe>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No songs in this set yet. Use the search above or add a new song.</p>
          )}
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
