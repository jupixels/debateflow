import { db } from '../db';
import { addSection, createArgument, createCase, createQuestion, createResolution, saveResponse, sectionsOf, updateSection } from './repo';

/** A small example bank so a new user can try the flow tools straight away. */
export async function loadSampleBank(): Promise<string> {
  const res = await createResolution('Sample: The US should ban single-use plastics', 'Example topic');
  const jobs = await createArgument(res.id, 'CON', 'Ban costs manufacturing jobs');
  const ocean = await createArgument(res.id, 'PRO', 'Plastic pollution harms oceans');

  await saveResponse({
    argumentId: jobs.id,
    kind: 'NU',
    isCard: true,
    tag: 'Plastics jobs already declining from automation',
    cite: 'Example 23, illustrative cite',
    text: 'Placeholder card text: replace this with your own evidence.',
    strength: 3,
  });
  await saveResponse({
    argumentId: jobs.id,
    kind: 'LINK_TURN',
    isCard: false,
    tag: 'Alternatives industry creates more jobs than it removes',
    text: 'Firms shift to paper, glass and reusables, which are more labor-intensive per unit.',
    strength: 2,
  });
  await saveResponse({
    argumentId: jobs.id,
    kind: 'WEIGHING',
    isCard: false,
    tag: 'Prefer our impact on scope: ocean harms are global and irreversible',
    text: '',
    strength: 2,
  });
  await saveResponse({
    argumentId: ocean.id,
    kind: 'MITIGATION',
    isCard: false,
    tag: 'Most ocean plastic comes from outside the US',
    text: 'Even a total US ban barely changes global ocean plastic.',
    strength: 3,
  });
  await createQuestion(jobs.id, 'How many of those jobs are already being automated away?');
  await createQuestion(jobs.id, 'Do companies making alternatives hire workers too?');
  await createQuestion(ocean.id, 'What share of ocean plastic comes from the US?');

  // A short pro case, so the Case tab, reading mode and frontlines have something to show.
  const c = await createCase(res.id, 'PRO', 'Sample pro case');
  const [intro, c1] = await sectionsOf(c.id);
  await updateSection(intro.id, {
    body: 'We affirm. Single-use plastics are cheap to make and expensive to clean up, and a ban is the only way to stop the damage.',
  });
  await updateSection(c1.id, {
    title: 'C1: Ocean ecosystems',
    body: 'Placeholder: millions of tons of plastic enter the ocean each year, harming marine life and fisheries. Replace with your own cards.',
  });
  const c2 = await addSection(c.id, 'contention');
  await updateSection(c2.id, {
    title: 'C2: Public health',
    body: 'Placeholder: microplastics are now found in drinking water and food. Replace with your own cards.',
  });
  const c1Arg = (await db.sections.get(c1.id))!.argumentId!;
  await saveResponse({
    argumentId: c1Arg,
    kind: 'OTHER',
    isCard: false,
    tag: 'Even if most plastic is foreign, US exports of plastic waste make it ours',
    against: 'Most ocean plastic comes from outside the US',
    text: '',
    strength: 3,
  });
  const q = await createQuestion(c1Arg, 'Doesn’t most ocean plastic come from other countries?');
  await db.questions.update(q.id, { answer: 'Much of it is US waste we ship abroad, so a ban cuts it at the source.' });
  return res.id;
}
