import type { ChristianTradition } from './christian-traditions';
import { db } from './database';

export type ApprovedChristianTradition = {
  tradition: ChristianTradition;
  framingGuideVersion: string;
  corpusVersion: string;
  testSuiteVersion: string;
  approvedAt: Date;
};

export async function getApprovedChristianTraditions(): Promise<ApprovedChristianTradition[]> {
  const approvals = await db.query.christianTraditionApprovals.findMany();
  return approvals
    .filter(
      (approval) =>
        approval.reviewerOneId !== approval.reviewerTwoId &&
        approval.framingGuideVersion.trim().length > 0 &&
        approval.corpusVersion.trim().length > 0 &&
        approval.testSuiteVersion.trim().length > 0,
    )
    .map(
      ({ reviewerOneId: _reviewerOneId, reviewerTwoId: _reviewerTwoId, ...approval }) => approval,
    );
}

export async function isChristianTraditionApproved(tradition: ChristianTradition) {
  const approvals = await getApprovedChristianTraditions();
  return approvals.some((approval) => approval.tradition === tradition);
}
