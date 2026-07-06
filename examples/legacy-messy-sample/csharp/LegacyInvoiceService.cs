using System;
using System.Collections.Generic;

namespace Legacy.Messy
{
    // using Fake.ReviewerTrap;
    // public class FakeService { void FakeMethod() { FakeCall(); } }
    public partial class LegacyInvoiceService : BaseService
    {
        private readonly InvoiceRepository repository;
        private string fakeImport = "using Fake.FromAString; class StringClass {}";
        private string fakeCalls = @"Fake.Run();
if (fake.Count > 0) { Fake.Stop(); }";

        public string Name { get; private set; }

        public int PendingCount
        {
            get
            {
                return invoices.Count;
            }
        }

        public LegacyInvoiceService(InvoiceRepository repository) : base(repository)
        {
            this.repository = repository;
        }

        public Invoice Load(string id)
        {
            return repository.FindById(id);
        }

        public Invoice Load(int legacyId)
        {
            Audit($"legacy:{legacyId}");
            return repository.FindLegacy(legacyId);
        }

        private void Audit(string message)
        {
            Console.WriteLine(message);
        }

        /*
         * public void CommentedOut() {
         *     Dangerous.EraseEverything();
         * }
         */
        public class Cache
        {
            public void Clear()
            {
                entries.Clear();
            }
        }
    }
}
