package fixtures;

public class NestedClass {
    private int count;

    public void increment() {
        count++;
        audit();
    }

    private void audit() {
    }

    public static class Inner {
        public void run() {
            execute();
        }

        private void execute() {
        }
    }
}
