namespace Fixtures
{
    public class Properties
    {
        public string Name { get; set; }
        public int Count { get; private set; }

        public string DisplayName
        {
            get
            {
                return Format(Name);
            }
        }

        private string Format(string value)
        {
            return value;
        }
    }
}
