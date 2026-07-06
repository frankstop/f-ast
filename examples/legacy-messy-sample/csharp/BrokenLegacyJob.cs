namespace Legacy.Messy
{
    public class BrokenLegacyJob
    {
        public void Run()
        {
            queue.Process();
            if (queue.Count > 0)
            {
                Audit();
            }
        // Intentionally missing closing braces to demonstrate partial output.
