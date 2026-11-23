---
publish: true
kind: writeup
---
Hey guys, so I am writing this because virtual box can be a pain at times with shared folder, and maybe explain some stuff too. I wrote this quickly so no judgy. >:]

  

Ok, first off, you need to download the ISO image of Ubuntu Desktop if you haven’t already. That can be found [here](https://ubuntu.com/download/desktop).

**Note: It would be best to use the LTS version, which stands for Long Term Support, which I think is about 8 years at time of release.

  

At this point, you need to have Oracle VirtualBox installed as well. You can find that [here](https://www.virtualbox.org/wiki/Downloads).

![[Media/Untitled 3.png|Untitled 3.png]]

You need to select your given OS, in my case, it is Windows, so we would choose _Windows_ _hosts._

Once that is all installed, we need to create a VM, or virtual machine, to host and run your new Ubuntu Image file.

### VM VirtualBox Interface

![[Media/Untitled 1 2.png|Untitled 1 2.png]]

Let’s get a bit familiar with VirtualBox. I know this seems stupid to mention, but trust me, it is important to understand the interface you are going to be working with.

  

The blue box is your VMs themselves, this is where you can choose the given _boxes_ that have already been set up and are (hopefully) ready to run.

The red box is the new icon, which is where you would create a new box. This is if you have a new OS (such as our ubuntu image) and you want to create a new, fresh environment based on that image.

The brown box is settings the given selected box. This is where everything _outside_ of the OS will be set, so anything hardware wise such as displays, storage, memory, cores, and other interfaces. This is where we are going to be mounting the shared folder.

The lavender is the start button, which starts the VM box. There is a couple different ways that you can such down a VM, but that is up to you in terms of whatever state you want it to be in.

And finally, the yellow group is your information about the box in more detail. This is mostly for checking quick details about the current runtime of that particular box.

  

Ok, so let’s create the VM. Go to the new button to create a new VM, you should see a window like this:

![[Media/Untitled 2 2.png|Untitled 2 2.png]]

For the name, fill in what you would want it to be called on the side bar and in relation to VirtualBox. This does not effect anything within the environment.

Then set the folder. This is where all the given VM’s stuff is going to be stored.

**Note: NO OneDrive or Cloud storage location if possible as things can get a little messy. Try to place it locally and have the backup service point to that local directory.

And finally, load the image ISO file that you downloaded. Remember that this is just the _installer image,_ and after the VM is created, the file can be deleted.

![[Media/Untitled 3 2.png|Untitled 3 2.png]]

This is the user creation part. Normally, when installing on a system bare bone, the installer itself would ask for this. VirtualBox uses magic to auto do that for you. Change the password as well, as this will be what you will be typing for certain commands, namely _sudo._ Hostname you can change to whatever as well. In this case, I will be naming it liviu. Everything else, just leave default.

![[Media/Untitled 4.png]]

**This part is important**. You need to set the amount of resources given to the VM. 2 cores is the minimum I would suggest, but more doesn’t hurt. Same for memory, the more you given, the faster it will install and run. Anything in the green segment is safe, and I would encourage anything more than the default.

![[Media/Untitled 5.png]]

Try to give as much at least 25 to 40 GB of storage for the VDI. Anything less than that may cause suffering later on. If you don’t have the room, delete something or go back and set the install directory to a external drive or secondary drive.

  

Once that is all done, launch the VM if you haven’t already (it may launch automatically).

![[Media/Untitled 6.png]]

Eventually, you should see a window like this. This is the file system installing on it’s own because of the VirtualBox magic we talked about earlier.

![[Media/Untitled 7.png]]

You should be greeted by a screen such as this. Click the user and enter the password you set earlier. A couple different pop ups will show up, you can just ignore and skip those.

![[Media/Untitled 8.png]]

Alright, the desktop, perfect. Too bad you are not going to be using it much lol.

Click inside the window somewhere, and hit the windows key. Type terminal, and that should bring up the Terminal icon. Once it does, you can hit enter the launch the program.

![[Media/Untitled 9.png]]

  

Alright, so there is a couple different things we need to do to get the shared folder working and your environment in order. First things first, run:

```Bash
sudo apt update && sudo apt upgrade
```

This command will update and upgrade all the current packages on the OS, you want to do this every so often, but keep in mind _upgrading_ can sometimes break things.

  

**Note: if you ran into an error like this:

```Bash
user is not in the sudoers file. This incident will be reported.
```

Click the page below:

[[Writeups/Getting VirtualBox to play nicely/Issue with Sudoer/Issue with Sudoer|Issue with Sudoer]]

  

![[Media/Untitled 10.png]]

You should maybe see something like this, although packages and sizes change frequently. At the bottom, you will see a prompt like [Y/n]. This means yes or no to continue with the update, assuming you reviewed the output. Hit y and then hit enter to continue.

  

Now we need to install packages for everything, including the environment. We need to install the packages necessary for the shared folder to work.

If you haven’t already, you need to create a folder somewhere in your main OS for the shared folder to exist. Again, somewhere local, no cloud storage stuff.

Once that is done, in the terminal on Ubuntu, type:

```Bash
sudo apt install virtualbox-guest-utils
```

Once that is done, type:

```Bash
cd /
sudo mkdir shared_folder
sudo chown root:vboxsf /shared_folder/
```

We can confirm the command by:

```Bash
ls -al
```

![[Media/Untitled 11.png]]

Great, now we have a directory in Ubuntu that has the properly group permissions. We need to add your current user to the vboxsf group to make sure you have access to the directory.

```Bash
sudo usermod -aG vboxsf $USER
```

You can type this as is, as $USER pulls the current user.

In order for this change to make effect, you need to logout or restart the box to have the changes take place for the new group.

Once that is done, we need to go to the VirtualBox Window again.

![[Media/Untitled 12.png]]

Click Settings, and go to the Shared Folder column.

![[Media/Untitled 13.png]]

Click the add button.

![[Media/Untitled 14.png]]

For Folder path, this is the Windows sided directory. Folder name can be whatever the default is.

The mount point is the linux side, in our case it is /shared_folder/. Auto-mount and permanent are for ensuring it mounts correctly every time you boot up the box.

Go ahead the hit ok for everything and reboot the box. In the mean time, go to the shared folder on windows and create a text file. This is to make sure everything is working fine.

Once the box is booted, change your directory to the shared folder in linux and confirm it is working.

![[Media/Untitled 15.png]]

Perfect, the text file is there.

  

There you have it, the shared folder is now working. Install whatever packages Liviu needs you too, such as git, build-essential, net-tools, and other stuff.

  

Hope this helped :]

---
[[main/Writeups|Writeups]]
