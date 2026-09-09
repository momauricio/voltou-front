import type { MetadataRoute } from 'next';
import { siteSitemap } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return siteSitemap();
}
