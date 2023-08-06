type Link = {
    href: string;
    text: string;
  };
  
  type SidebarProps = {
    links: Link[];
  };
  
  const Sidebar = ({ links }: SidebarProps) => {
    return (
      <div className="sidebar">
        <h3 className="sidebar-title">Navigation</h3>
        <ul className="sidebar-links">
          {links.map((link, index) => (
            <li key={index}>
              <a href={link.href}>{link.text}</a>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  export default Sidebar;