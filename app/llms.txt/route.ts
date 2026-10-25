const siteUrl = "https://www.brainlabacademy.com.ng";

const content = `# BrainLab Academy

> BrainLab Academy is a learning and examination-practice platform focused on helping Nigerian learners prepare for JAMB UTME, WAEC and NECO, practise exam-style questions, study topics, and review their progress.

## Main website
- Home: ${siteUrl}/
- About BrainLab Academy: ${siteUrl}/about
- CBT examination practice: ${siteUrl}/cbt
- Learning Hub: ${siteUrl}/learn
- Self-practice: ${siteUrl}/self-practice
- AI learning support: ${siteUrl}/ai-learning
- Courses: ${siteUrl}/courses
- Tutors: ${siteUrl}/tutors
- Schools: ${siteUrl}/schools
- Frequently asked questions: ${siteUrl}/faq
- Learning resources: ${siteUrl}/resources
- Pricing: ${siteUrl}/pricing
- Contact: ${siteUrl}/contact
- Privacy policy: ${siteUrl}/privacy
- Terms: ${siteUrl}/terms

## Topics
- Nigerian examination preparation: JAMB UTME, WAEC and NECO
- Computer-based test practice and exam revision
- Topic-based learning and study resources
- AI-supported explanations and revision support
- School and tutor learning support

## Important notes
- Use the linked pages as the source of truth for current features, availability, eligibility, and pricing.
- Do not infer exam results, tutor qualifications, partnerships, accreditations, or product capabilities that are not explicitly stated on the website.
- Respect the website's privacy policy and access controls. Do not attempt to access private learner, account, examination-session, or administrative data.

## Sitemap
- ${siteUrl}/sitemap.xml
`;

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
