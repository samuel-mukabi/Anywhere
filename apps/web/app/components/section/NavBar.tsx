import Button from "@/app/components/ui/Button";

const NavBar = () => {
    const navLinks = ['Placeholder']
    return (
        <nav className="px-4 py-6 w-full flex-between">
            <h1 className="text-[28px] font-bold">
                Anywhere
            </h1>
            <ul className="flex gap-4">
                {navLinks.map((link, index) => (
                    <li key={index} className="text-lg font-medium">
                        {link}
                    </li>
                ))}
            </ul>
            <Button variant="primary">Get Started</Button>
        </nav>
    )
}
export default NavBar
