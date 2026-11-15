import { DataRetentionService, RETENTION } from './data-retention.service';

describe('DataRetentionService', () => {
  const now = new Date('2026-11-15T03:00:00Z');
  const daysAgo = (d: Date) => Math.round((now.getTime() - d.getTime()) / 86_400_000);

  it('borra cada dato personal pasado su plazo y deja los expedientes', async () => {
    const del = () => jest.fn().mockReturnValue({ count: 0 });
    const prisma = {
      loginEvent: { deleteMany: del() },
      loginChallenge: { deleteMany: del() },
      userToken: { deleteMany: del() },
      revokedToken: { deleteMany: del() },
      $transaction: jest.fn().mockResolvedValue([{ count: 3 }, { count: 2 }, { count: 5 }, { count: 1 }, { count: 4 }]),
    };
    const service = new DataRetentionService(prisma as never, { get: () => 'production' } as never);
    await expect(service.purge(now)).resolves.toEqual({
      loginEvents: 3,
      unknownLoginEvents: 2,
      loginChallenges: 5,
      userTokens: 1,
      revokedTokens: 4,
    });
    const [all, unknown] = prisma.loginEvent.deleteMany.mock.calls.map((c) => c[0].where);
    expect(daysAgo(all.createdAt.lt)).toBe(RETENTION.loginEventsDays);
    expect(unknown).toMatchObject({ userId: null });
    expect(daysAgo(unknown.createdAt.lt)).toBe(RETENTION.unknownLoginEventsDays);
    expect(prisma.revokedToken.deleteMany.mock.calls[0][0].where).toEqual({ expiresAt: { lt: now } });
    // Casos, documentos y actividad (el expediente) no se tocan
    expect(Object.keys(prisma)).not.toContain('case');
    expect(Object.keys(prisma)).not.toContain('activityEvent');
  });
});
