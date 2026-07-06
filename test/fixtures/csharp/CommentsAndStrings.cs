namespace Fixtures
{
    // using Fake.Hidden;
    // public class Phantom { public void Haunt() { Ghost.Call(); } }
    public class CommentsAndStrings
    {
        /*
         * public class BlockPhantom {
         *     public void Escape() { Fake.Run(); }
         * }
         */
        private string fake = "using Fake.StringImport; class StringPhantom { void Lie() {} }";
        private string verbatim = @"using Fake.Verbatim;
public class VerbatimPhantom { void Pretend() { Fake.Run(); } }";
        private string interpolated = $"Fake.Call({nameof(fake)})";
        private char brace = '}';

        public void Run()
        {
            RealCall();
        }

        private void RealCall()
        {
        }
    }
}
