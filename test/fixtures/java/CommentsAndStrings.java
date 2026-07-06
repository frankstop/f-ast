package fixtures;

// import fake.Hidden;
// public class Phantom { public void haunt() { Ghost.call(); } }
public class CommentsAndStrings {
    /*
     * public class BlockPhantom {
     *     public void escape() { Fake.run(); }
     * }
     */
    private String fake = "import fake.StringImport; class StringPhantom { void lie() {} }";
    private char brace = '}';

    public void run() {
        realCall();
    }

    private void realCall() {
    }
}
