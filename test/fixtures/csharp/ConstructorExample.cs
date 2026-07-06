namespace Fixtures
{
    public class ConstructorExample : BaseExample
    {
        private readonly string value;

        public ConstructorExample(string value) : base(value)
        {
            this.value = value;
        }
    }
}
