import axios from 'axios';

const API_KEY = '285e23c2d36f028a4d24f3a19d723a05';
const BASE_URL = 'http://ws.audioscrobbler.com/2.0/';

export interface LastfmTrack {
  name: string;
  playcount: string;
  artist: { name: string };
  image: { '#text': string; size: string }[];
}

export interface LastfmArtist {
  name: string;
  playcount: string;
  image: { '#text': string; size: string }[];
}

export const getLastfmTopTracks = async (username: string, limit: number = 50): Promise<LastfmTrack[]> => {
  try {
    const res = await axios.get(BASE_URL, {
      params: {
        method: 'user.gettoptracks',
        user: username,
        api_key: API_KEY,
        format: 'json',
        limit: limit,
      }
    });
    return res.data?.toptracks?.track || [];
  } catch (error) {
    console.error('Lỗi khi tải Last.fm Top Tracks:', error);
    return [];
  }
};

export const getLastfmTopArtists = async (username: string, limit: number = 50): Promise<LastfmArtist[]> => {
  try {
    const res = await axios.get(BASE_URL, {
      params: {
        method: 'user.gettopartists',
        user: username,
        api_key: API_KEY,
        format: 'json',
        limit: limit,
      }
    });
    return res.data?.topartists?.artist || [];
  } catch (error) {
    console.error('Lỗi khi tải Last.fm Top Artists:', error);
    return [];
  }
};
