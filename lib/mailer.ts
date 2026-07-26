import nodemailer from 'nodemailer';

// Server-only — uses the Gmail app password from .env.local.
// Never import this into a 'use client' component.
export const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});