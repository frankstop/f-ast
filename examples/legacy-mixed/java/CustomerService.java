package legacy.billing;

import java.util.List;

public class CustomerService {
    private CustomerRepository repository;

    public CustomerService(CustomerRepository repository) {
        this.repository = repository;
    }

    public Customer findCustomer(String id) {
        Customer customer = repository.findById(id);
        audit(customer);
        return customer;
    }

    private void audit(Customer customer) {
        System.out.println(customer.getName());
    }
}
