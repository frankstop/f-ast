package legacy.orders;

import java.util.ArrayList;

public class OrderService {
    private OrderRepository repository;

    public Order load(String id) {
        Order order = repository.findById(id);
        notify(order);
        return order;
    }

    private void notify(Order order) {
        System.out.println(order.toString());
    }
}
