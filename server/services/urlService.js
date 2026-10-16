import supabase from '../config/supabase.js';
import { generateUniqueCode } from '../utils/generateCode.js';

export const createShortUrl = async (originalUrl) => {
  const shortCode = await generateUniqueCode('urls', 'short_code', 6);
  
  const { data, error } = await supabase
    .from('urls')
    .insert([
      { original_url: originalUrl, short_code: shortCode }
    ])
    .select()
    .single();

  if (error) {
    console.error('Supabase Error during insert:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      attempted: { original_url: originalUrl, short_code: shortCode }
    });
    throw new Error('Database error while creating short URL');
  }

  return data;
};

export const getUrlByShortCode = async (shortCode) => {
  const { data, error } = await supabase
    .from('urls')
    .select('*')
    .eq('short_code', shortCode)
    .single();

  if (error && error.code === 'PGRST116') {
    return null;
  }
  
  if (error) {
    throw new Error('Database error while fetching URL');
  }

  return data;
};

export const incrementClickCount = async (id, updatedClicks) => {
  const { error } = await supabase
    .from('urls')
    .update({ clicks: updatedClicks })
    .eq('id', id);

  if (error) {
    console.error('Error updating click count in database:', error);
  }
};
