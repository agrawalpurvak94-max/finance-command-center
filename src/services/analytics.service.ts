import { MockAnalyticsRepository } from '@/repositories/mock-analytics.repository'

// Module 12A's single swap point: replace with `new SupabaseAnalyticsRepository()`.
const repository = new MockAnalyticsRepository()

export const analyticsService = {
  getSummary: repository.getSummary.bind(repository),
  getSpendTrend: repository.getSpendTrend.bind(repository),
  getOwnerTypeSpend: repository.getOwnerTypeSpend.bind(repository),
  getCategorySpend: repository.getCategorySpend.bind(repository),
  getMerchantSpend: repository.getMerchantSpend.bind(repository),
  getClientSpend: repository.getClientSpend.bind(repository),
  getCreditCardSpend: repository.getCreditCardSpend.bind(repository),
  getBankAccountActivity: repository.getBankAccountActivity.bind(repository),
  getHighestTransactions: repository.getHighestTransactions.bind(repository),
  getRecurringMerchants: repository.getRecurringMerchants.bind(repository),
  getLargestExpenses: repository.getLargestExpenses.bind(repository),
  getRefundAnalysis: repository.getRefundAnalysis.bind(repository),
  getInsights: repository.getInsights.bind(repository),
  listBankNames: repository.listBankNames.bind(repository),
}
