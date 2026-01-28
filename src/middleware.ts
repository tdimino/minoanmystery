import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Rewrite resume.minoanmystery.org to /resume
  if (url.hostname === 'resume.minoanmystery.org') {
    // Rewrite to /resume page
    return context.rewrite('/resume');
  }

  // Redirect non-www to www
  if (url.hostname === 'minoanmystery.org') {
    url.hostname = 'www.minoanmystery.org';
    return context.redirect(url.toString(), 301);
  }

  return next();
});
