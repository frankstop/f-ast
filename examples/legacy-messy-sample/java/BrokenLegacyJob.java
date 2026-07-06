package legacy.messy;

public class BrokenLegacyJob {
    public void run() {
        queue.process();
        if (queue.size() > 0) {
            audit();
        }
    // Intentionally missing closing braces to demonstrate partial output.
