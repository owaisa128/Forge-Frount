// import React, { useState } from 'react';
// import { HugeiconsIcon, AlertCircle, CheckCircle2, FileText, Mail, MessageSquare, Send, User } from "../components/ui/icons";
// import api from '../api/axios';
// import PageHeader from '../components/PageHeader';
// import { Button, Field } from '../components/ui';
// export default function Contact() {
//   const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState('');
//   const [notice, setNotice] = useState('');
//   const updateField = (event) => {
//     setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
//     setError('');
//     setNotice('');
//   };
//   const submitMessage = async (event) => {
//     event.preventDefault();
//     setError('');
//     setNotice('');
//     setSubmitting(true);
//     try {
//       const { data } = await api.post('/feedback/contact', {
//         name: form.name.trim(),
//         email: form.email.trim(),
//         subject: form.subject.trim(),
//         message: form.message.trim(),
//       });
//       if (!data?.success) throw new Error(data?.message || 'Your message could not be sent.');
//       setForm({ name: '', email: '', subject: '', message: '' });
//       setNotice(data.message || 'Your message has been sent to the FORGE team.');
//     } catch (requestError) {
//       setError(
//         requestError.response?.data?.message ||
//           requestError.message ||
//           'Unable to send your message right now.'
//       );
//     } finally {
//       setSubmitting(false);
//     }
//   };
//   return (
//     <div className="relative isolate mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-12 text-forma-text-primary sm:px-6 sm:py-16 lg:px-8">
//       {' '}
//       <div className="relative z-10 mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
//         {' '}
//         <PageHeader as="header" className="flex-col items-start">
//           {' '}
//           <p className="inline-flex items-center gap-2 rounded-full border border-forma-brand-ember/30 bg-forma-bg-surface px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-forma-status-error">
//             {' '}
//             <HugeiconsIcon aria-hidden="true" icon={MessageSquare} className="h-4 w-4 text-forma-brand-ember" /> Contact FORGE{' '}
//           </p>{' '}
//           <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
//             {' '}
//             Contact the <span className="text-[var(--primary)]">FORGE team.</span>{' '}
//           </h1>{' '}
//           <p className="mt-4 max-w-lg text-sm leading-relaxed text-forma-text-primary sm:text-base">
//             {' '}
//             Have a question about FORGE? Send our team a message and we’ll get back to you at the
//             email address you provide.{' '}
//           </p>{' '}
//           <div className="mt-8 flex items-start gap-3 rounded-2xl border border-forma-text-primary/10 bg-forma-bg-surface/80 p-4">
//             {' '}
//             <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forma-status-error/10 text-forma-status-error">
//               {' '}
//               <HugeiconsIcon aria-hidden="true" icon={Mail} className="h-5 w-5" />{' '}
//             </span>{' '}
//             <div>
//               {' '}
//               <h2 className="text-sm font-bold text-forma-text-primary">
//                 {' '}
//                 Messages go straight to our team{' '}
//               </h2>{' '}
//               <p className="mt-1 text-xs leading-relaxed text-forma-text-secondary">
//                 {' '}
//                 Your message will be securely saved and available to the FORGE team in the admin
//                 support inbox.{' '}
//               </p>{' '}
//             </div>{' '}
//           </div>{' '}
//         </PageHeader>{' '}
//         <section
//           aria-label="Contact form"
//           className={`rounded-2xl border p-5 sm:p-7 border-forma-text-primary/10 bg-forma-bg-base/45`}
//         >
//           {' '}
//           <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-forma-brand-ember-hover">
//             {' '}
//             Get in touch{' '}
//           </p>{' '}
//           <h2 className="text-2xl font-bold tracking-tight text-forma-text-primary">
//             {' '}
//             Send us a message{' '}
//           </h2>{' '}
//           <p className="mt-1 text-xs text-forma-text-secondary sm:text-sm">
//             {' '}
//             All fields are required.{' '}
//           </p>{' '}
//           {error && (
//             <div
//               role="alert"
//               className="mt-5 flex items-start gap-3 rounded-xl border border-forma-status-error/25 bg-forma-status-error/10 p-4 text-sm text-forma-status-error"
//             >
//               {' '}
//               <HugeiconsIcon aria-hidden="true" icon={AlertCircle} className="mt-0.5 h-5 w-5 shrink-0 text-forma-status-error" />{' '}
//               <span>{error}</span>{' '}
//             </div>
//           )}{' '}
//           {notice && (
//             <div
//               role="status"
//               className="mt-5 flex items-start gap-3 rounded-xl border border-forma-status-success/25 bg-forma-status-success/10 p-4 text-sm text-forma-status-success"
//             >
//               {' '}
//               <HugeiconsIcon aria-hidden="true" icon={CheckCircle2} className="mt-0.5 h-5 w-5 shrink-0 text-forma-status-success" />{' '}
//               <span>{notice}</span>{' '}
//             </div>
//           )}{' '}
//           <form onSubmit={submitMessage} className="mt-6 space-y-4">
//             {' '}
//             <div className="grid gap-4 sm:grid-cols-2">
//               {' '}
//               <Field
//                 id="contact-name"
//                 name="name"
//                 label="Name"
//                 icon={User}
//                 type="text"
//                 autoComplete="name"
//                 value={form.name}
//                 onChange={updateField}
//                 placeholder="Your full name"
//                 minLength={2}
//                 maxLength={100}
//                 required
//               />
//               <Field
//                 id="contact-email"
//                 name="email"
//                 label="Email"
//                 icon={Mail}
//                 type="email"
//                 autoComplete="email"
//                 value={form.email}
//                 onChange={updateField}
//                 placeholder="you@example.com"
//                 maxLength={254}
//                 required
//               />
//             </div>{' '}
//             <Field
//               id="contact-subject"
//               name="subject"
//               label="Subject"
//               icon={FileText}
//               type="text"
//               value={form.subject}
//               onChange={updateField}
//               placeholder="What is this about?"
//               maxLength={150}
//               required
//             />
//             <div>
//               <Field
//                 id="contact-message"
//                 as="textarea"
//                 name="message"
//                 label="Message"
//                 hint={`${form.message.length}/5000 characters`}
//                 value={form.message}
//                 onChange={updateField}
//                 placeholder="Tell us how we can help…"
//                 maxLength={5000}
//                 rows={6}
//                 required
//               />{' '}
//             </div>{' '}
//             <Button
//               type="submit"
//               disabled={submitting}
//               variant="primary"
//             >
//               {' '}
//               {submitting ? (
//                 <span className="vf-spinner" aria-hidden="true" />
//               ) : (
//                 <HugeiconsIcon aria-hidden="true" icon={Send} className="h-4 w-4" />
//               )}{' '}
//               {submitting ? 'Sending…' : 'Send message'}{' '}
//             </Button>{' '}
//           </form>{' '}
//         </section>{' '}
//       </div>{' '}
//     </div>
//   );
// }




import React, { useState } from 'react';
import { HugeiconsIcon, AlertCircle, CheckCircle2, FileText, Mail, MessageSquare, Send, User } from "../components/ui/icons";
import api from '../api/axios';
import PageHeader from '../components/PageHeader';
import { Button, Field } from '../components/ui';
export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
    setNotice('');
  };
  const submitMessage = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/feedback/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      if (!data?.success) throw new Error(data?.message || 'Your message could not be sent.');
      setForm({ name: '', email: '', subject: '', message: '' });
      setNotice(data.message || 'Your message has been sent to the FORGE team.');
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          (requestError.code === 'ERR_NETWORK'
            ? 'Cannot reach the FORGE server. Check that the backend is running and the API URL is correct.'
            : requestError.message) ||
          'Unable to send your message right now.'
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="relative isolate mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-12 text-forma-text-primary sm:px-6 sm:py-16 lg:px-8">
      {' '}
      <div className="relative z-10 mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        {' '}
        <PageHeader as="header" className="flex-col items-start">
          {' '}
          <p className="inline-flex items-center gap-2 rounded-full border border-forma-brand-ember/30 bg-forma-bg-surface px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-forma-status-error">
            {' '}
            <HugeiconsIcon aria-hidden="true" icon={MessageSquare} className="h-4 w-4 text-forma-brand-ember" /> Contact FORGE{' '}
          </p>{' '}
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            {' '}
            Contact the <span className="text-[var(--primary)]">FORGE team.</span>{' '}
          </h1>{' '}
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-forma-text-primary sm:text-base">
            {' '}
            Have a question about FORGE? Send our team a message and we’ll get back to you at the
            email address you provide.{' '}
          </p>{' '}
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-forma-text-primary/10 bg-forma-bg-surface/80 p-4">
            {' '}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forma-status-error/10 text-forma-status-error">
              {' '}
              <HugeiconsIcon aria-hidden="true" icon={Mail} className="h-5 w-5" />{' '}
            </span>{' '}
            <div>
              {' '}
              <h2 className="text-sm font-bold text-forma-text-primary">
                {' '}
                Messages go straight to our team{' '}
              </h2>{' '}
              <p className="mt-1 text-xs leading-relaxed text-forma-text-secondary">
                {' '}
                Your message will be emailed directly to the FORGE team.{' '}
              </p>{' '}
            </div>{' '}
          </div>{' '}
        </PageHeader>{' '}
        <section
          aria-label="Contact form"
          className={`rounded-2xl border p-5 sm:p-7 border-forma-text-primary/10 bg-forma-bg-base/45`}
        >
          {' '}
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-forma-brand-ember-hover">
            {' '}
            Get in touch{' '}
          </p>{' '}
          <h2 className="text-2xl font-bold tracking-tight text-forma-text-primary">
            {' '}
            Send us a message{' '}
          </h2>{' '}
          <p className="mt-1 text-xs text-forma-text-secondary sm:text-sm">
            {' '}
            All fields are required.{' '}
          </p>{' '}
          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-xl border border-forma-status-error/25 bg-forma-status-error/10 p-4 text-sm text-forma-status-error"
            >
              {' '}
              <HugeiconsIcon aria-hidden="true" icon={AlertCircle} className="mt-0.5 h-5 w-5 shrink-0 text-forma-status-error" />{' '}
              <span>{error}</span>{' '}
            </div>
          )}{' '}
          {notice && (
            <div
              role="status"
              className="mt-5 flex items-start gap-3 rounded-xl border border-forma-status-success/25 bg-forma-status-success/10 p-4 text-sm text-forma-status-success"
            >
              {' '}
              <HugeiconsIcon aria-hidden="true" icon={CheckCircle2} className="mt-0.5 h-5 w-5 shrink-0 text-forma-status-success" />{' '}
              <span>{notice}</span>{' '}
            </div>
          )}{' '}
          <form onSubmit={submitMessage} className="mt-6 space-y-4">
            {' '}
            <div className="grid gap-4 sm:grid-cols-2">
              {' '}
              <Field
                id="contact-name"
                name="name"
                label="Name"
                icon={User}
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={updateField}
                placeholder="Your full name"
                minLength={2}
                maxLength={100}
                required
              />
              <Field
                id="contact-email"
                name="email"
                label="Email"
                icon={Mail}
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={updateField}
                placeholder="you@example.com"
                maxLength={254}
                required
              />
            </div>{' '}
            <Field
              id="contact-subject"
              name="subject"
              label="Subject"
              icon={FileText}
              type="text"
              value={form.subject}
              onChange={updateField}
              placeholder="What is this about?"
              maxLength={150}
              required
            />
            <div>
              <Field
                id="contact-message"
                as="textarea"
                name="message"
                label="Message"
                hint={`${form.message.length}/5000 characters`}
                value={form.message}
                onChange={updateField}
                placeholder="Tell us how we can help…"
                maxLength={5000}
                rows={6}
                required
              />{' '}
            </div>{' '}
            <Button
              type="submit"
              disabled={submitting}
              variant="primary"
            >
              {' '}
              {submitting ? (
                <span className="vf-spinner" aria-hidden="true" />
              ) : (
                <HugeiconsIcon aria-hidden="true" icon={Send} className="h-4 w-4" />
              )}{' '}
              {submitting ? 'Sending…' : 'Send message'}{' '}
            </Button>{' '}
          </form>{' '}
        </section>{' '}
      </div>{' '}
    </div>
  );
}
