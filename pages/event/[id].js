import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';

export default function EventPage() {
  const router = useRouter();
  const { id } = router.query;

  const [event, setEvent] = useState(null);
  const [songs, setSongs] = useState([]);
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const docRef = doc(db, 'events', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setEvent({ id: docSnap.id, ...docSnap.data() });
      }
      const songsSnapshot = await getDocs(collection(docRef, 'songs'));
      setSongs(songsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, [id]);

  const handleAddSong = async (e) => {
    e.preventDefault();
    if (!title || !pdfFile) return;
    // upload pdf to storage
    const storageRef = ref(storage, `events/${id}/${Date.now()}-${pdfFile.name}`);
    await uploadBytes(storageRef, pdfFile);
    const pdfUrl = await getDownloadURL(storageRef);

    const songsRef = collection(db, 'events', id, 'songs');
    await addDoc(songsRef, {
      title,
      youtubeUrl,
      pdfUrl,
      createdAt: Date.now(),
    });

    // reset fields
    setTitle('');
    setYoutubeUrl('');
    setPdfFile(null);
    // refetch songs
    const songsSnapshot = await getDocs(songsRef);
    setSongs(songsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const extractYouTubeId = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1);
      }
      const params = new URLSearchParams(urlObj.search);
      return params.get('v');
    } catch (err) {
      return '';
    }
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      {event && <h1>{event.name}</h1>}
      <form onSubmit={handleAddSong}>
        <input
          type="text"
          placeholder="Song title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: '0.5rem', marginRight: '0.5rem' }}
        />
        <input
          type="url"
          placeholder="YouTube URL (optional)"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          style={{ padding: '0.5rem', marginRight: '0.5rem' }}
        />
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files[0])}
          style={{ marginRight: '0.5rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem' }}>Add Song</button>
      </form>
      <h2>Songs</h2>
      <ul>
        {songs.map((song) => (
          <li key={song.id} style={{ marginBottom: '1rem' }}>
            <h3>{song.title}</h3>
            {song.pdfUrl && (
              <div>
                <a href={song.pdfUrl} target="_blank" rel="noopener noreferrer">View PDF</a>
              </div>
            )}
            {song.youtubeUrl && (
              <div style={{ marginTop: '0.5rem' }}>
                <iframe
                  width="420"
                  height="236"
                  src={`https://www.youtube.com/embed/${extractYouTubeId(song.youtubeUrl)}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
