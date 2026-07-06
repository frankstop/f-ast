package legacy.messy;

import java.util.List;

// import fake.ReviewerTrap;
// public class FakeService { void fakeMethod() { fakeCall(); } }
@Deprecated
public class LegacyCustomerService {
    private final CustomerRepository repository;
    private final String fakeImport = "import fake.FromAString; class StringClass {}";

    public LegacyCustomerService(CustomerRepository repository) {
        this.repository = repository;
    }

    public Customer load(String id) {
        return repository.findById(id);
    }

    public Customer load(int legacyId) {
        audit("legacy:" + legacyId);
        return repository.findLegacy(legacyId);
    }

    private void audit(String message) {
        System.out.println(message);
    }

    /*
     * public void commentedOut() {
     *     Dangerous.eraseEverything();
     * }
     */
    public static class Cache {
        public void clear() {
            entries.clear();
        }
    }
}
